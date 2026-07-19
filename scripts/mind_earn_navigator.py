#!/usr/bin/env python3
"""
MIND Earn Navigator: Validar submissões Superteam Earn
Descobre oportunidades, valida requirements, bloqueia incompletas
"""

import json
import hashlib
from typing import Optional
from datetime import datetime
from dataclasses import dataclass, asdict

# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass
class BuilderProfile:
    """Perfil do builder"""
    github_username: str
    telegram: str
    min_reward_usdc: float
    languages: list[str]
    regions: list[str]
    skills: list[str]
    availability: str  # "full_time", "part_time", "weekends"
    authorized_repos: list[str]

@dataclass
class Opportunity:
    """Oportunidade Superteam Earn"""
    listing_id: str
    title: str
    category: str
    agent_eligibility: str  # "AGENT_ONLY", "AGENT_ALLOWED", "HUMAN_ONLY", "UNKNOWN"
    reward_usdc: float
    required_fields: dict
    timestamp: str

@dataclass
class DeliveryArtifacts:
    """Artefatos de entrega"""
    repository_url: Optional[str]
    demo_url: Optional[str]
    video_url: Optional[str]
    docs_url: Optional[str]
    telegram: Optional[str]
    eligibility_answers: dict
    ask_amount_usdc: Optional[float]
    tests_passing: bool = False
    license: Optional[str] = "MIT"

@dataclass
class ApprovalReceipt:
    """Recibo de aprovação humana"""
    approved_by: str
    approved_at: str
    payload_hash: str
    notes: Optional[str] = None

# ============================================================================
# VALIDATION ENGINE
# ============================================================================

class MINDEarnValidator:
    """Validador de submissões Superteam Earn com gates de policy"""

    # Decision constants
    BLOCKED = "BLOCKED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    READY_FOR_APPROVAL = "READY_FOR_HUMAN_APPROVAL"
    SUBMIT_ALLOWED = "SUBMIT_ALLOWED"

    # Reason codes
    AGENT_NOT_ALLOWED = "RC_AGENT_NOT_ALLOWED"
    MISSING_FIELDS = "RC_MISSING_REQUIRED_FIELDS"
    LOW_MATCH = "RC_LOW_MATCH_SCORE"
    MISSING_DELIVERY = "RC_MISSING_DELIVERY_EVIDENCE"
    MISSING_TELEGRAM = "RC_MISSING_TELEGRAM"
    MISSING_ASK = "RC_MISSING_ASK_AMOUNT"
    NO_APPROVAL = "RC_NO_HUMAN_APPROVAL"

    # Policy
    MIN_MATCH_SCORE = 75
    ALLOWED_ELIGIBILITIES = ["AGENT_ONLY", "AGENT_ALLOWED"]
    BLOCKED_ELIGIBILITIES = ["HUMAN_ONLY", "UNKNOWN"]

    def __init__(self):
        self.validation_log = []

    def log(self, message: str, level: str = "info"):
        """Log validação"""
        self.validation_log.append({"timestamp": datetime.now().isoformat(), "level": level, "message": message})
        print(f"[{level.upper()}] {message}")

    def validate_submission(
        self,
        builder: BuilderProfile,
        opportunity: Opportunity,
        artifacts: DeliveryArtifacts,
        approval: Optional[ApprovalReceipt] = None,
    ) -> dict:
        """Valida submissão completa"""

        self.log(f"Validando submissão para: {opportunity.title}")

        # ========== GATE 1: Agent Eligibility ==========
        if opportunity.agent_eligibility in self.BLOCKED_ELIGIBILITIES:
            self.log(f"Oportunidade bloqueada: {opportunity.agent_eligibility}", "error")
            return self._blocked_response(
                opportunity.listing_id,
                [self.AGENT_NOT_ALLOWED],
                "Oportunidade é HUMAN_ONLY ou UNKNOWN",
                artifacts,
            )

        if opportunity.agent_eligibility not in self.ALLOWED_ELIGIBILITIES:
            self.log(f"Elegibilidade desconhecida: {opportunity.agent_eligibility}", "warn")

        # ========== GATE 2: Delivery Readiness ==========
        missing_items = self._check_delivery_artifacts(artifacts, opportunity)
        if missing_items:
            self.log(f"Artefatos faltando: {missing_items}", "error")
            return self._blocked_response(
                opportunity.listing_id,
                [self.MISSING_DELIVERY],
                f"Faltam: {', '.join(missing_items)}",
                artifacts,
            )

        # ========== GATE 3: Builder Match ==========
        match_score = self._calculate_match_score(builder, opportunity)
        self.log(f"Match score: {match_score}%")

        if match_score < self.MIN_MATCH_SCORE:
            self.log(f"Score baixo ({match_score} < {self.MIN_MATCH_SCORE})", "warn")
            return self._needs_review_response(
                opportunity.listing_id,
                [self.LOW_MATCH],
                match_score,
                missing_items,
                artifacts,
            )

        # ========== GATE 4: Payload Hash ==========
        payload_hash = self._compute_payload_hash(builder, opportunity, artifacts)
        self.log(f"Payload hash: {payload_hash[:16]}...")

        # ========== GATE 5: Human Approval Required ==========
        if not approval:
            self.log("Aprovação humana necessária", "warn")
            return {
                "card_id": f"{opportunity.listing_id}-{builder.github_username}",
                "decision": self.READY_FOR_APPROVAL,
                "submit_allowed": False,
                "match_score": match_score,
                "reason_codes": [],
                "missing_items": [],
                "required_submission_fields": self._build_submission_payload(
                    builder, opportunity, artifacts
                ),
                "payload_hash": payload_hash,
                "human_approval_required": True,
            }

        # Validar approval
        if approval.payload_hash != payload_hash:
            self.log("Approval hash não corresponde ao payload", "error")
            return self._blocked_response(
                opportunity.listing_id,
                ["RC_APPROVAL_HASH_MISMATCH"],
                "Payload foi modificado após aprovação",
                artifacts,
            )

        self.log("✅ Submissão pronta para enviar", "success")
        return {
            "card_id": f"{opportunity.listing_id}-{builder.github_username}",
            "decision": self.SUBMIT_ALLOWED,
            "submit_allowed": True,
            "match_score": match_score,
            "reason_codes": [],
            "missing_items": [],
            "required_submission_fields": self._build_submission_payload(
                builder, opportunity, artifacts
            ),
            "payload_hash": payload_hash,
            "human_approval_required": False,
            "approval_receipt": asdict(approval),
        }

    def _check_delivery_artifacts(self, artifacts: DeliveryArtifacts, opportunity: Opportunity) -> list[str]:
        """Verifica artefatos obrigatórios"""
        missing = []

        if not artifacts.repository_url:
            missing.append("repository_url")

        if not artifacts.telegram:
            missing.append("telegram")

        if opportunity.reward_usdc > 500 and not artifacts.ask_amount_usdc:
            missing.append("ask_amount_usdc (para bounty > $500)")

        if opportunity.category in ["trading", "agent"] and not artifacts.demo_url:
            missing.append("demo_url")

        if not artifacts.eligibility_answers:
            missing.append("eligibility_answers")

        return missing

    def _calculate_match_score(self, builder: BuilderProfile, opportunity: Opportunity) -> float:
        """Calcula match score (0-100)"""
        score = 100.0
        penalties = 0

        # Reward match
        if opportunity.reward_usdc < builder.min_reward_usdc:
            penalties += 15

        # Telegram presença
        if not builder.telegram:
            penalties += 10

        # Skill match (simplificado)
        relevant_skills = {
            "frontend": ["react", "typescript", "solana"],
            "backend": ["python", "rust", "node"],
            "data": ["analysis", "visualization"],
        }

        if opportunity.category in relevant_skills:
            has_skill = any(s in builder.skills for s in relevant_skills.get(opportunity.category, []))
            if not has_skill:
                penalties += 10

        return max(0, score - penalties)

    def _compute_payload_hash(
        self,
        builder: BuilderProfile,
        opportunity: Opportunity,
        artifacts: DeliveryArtifacts,
    ) -> str:
        """Computa hash imutável da submissão"""
        payload = {
            "builder": asdict(builder),
            "opportunity": asdict(opportunity),
            "artifacts": asdict(artifacts),
            "timestamp": datetime.now().isoformat(),
        }
        payload_str = json.dumps(payload, sort_keys=True, default=str)
        return hashlib.sha256(payload_str.encode()).hexdigest()

    def _build_submission_payload(
        self,
        builder: BuilderProfile,
        opportunity: Opportunity,
        artifacts: DeliveryArtifacts,
    ) -> dict:
        """Constrói payload pronto para submeter"""
        return {
            "listing_id": opportunity.listing_id,
            "builder_github": builder.github_username,
            "builder_telegram": builder.telegram,
            "repository_url": artifacts.repository_url,
            "demo_url": artifacts.demo_url,
            "video_url": artifacts.video_url,
            "ask_amount_usdc": artifacts.ask_amount_usdc,
            "eligibility_answers": artifacts.eligibility_answers,
            "description": f"Submissão automática validada via MIND Earn Navigator",
        }

    def _blocked_response(
        self,
        listing_id: str,
        reason_codes: list[str],
        reason: str,
        artifacts: DeliveryArtifacts,
    ) -> dict:
        """Resposta de submissão bloqueada"""
        self.log(f"❌ BLOQUEADA: {reason}", "error")
        return {
            "card_id": listing_id,
            "decision": self.BLOCKED,
            "submit_allowed": False,
            "match_score": 0,
            "reason_codes": reason_codes,
            "missing_items": [],
            "required_submission_fields": {},
            "payload_hash": self._compute_payload_hash({}, {}, artifacts),
            "human_approval_required": False,
        }

    def _needs_review_response(
        self,
        listing_id: str,
        reason_codes: list[str],
        match_score: float,
        missing_items: list[str],
        artifacts: DeliveryArtifacts,
    ) -> dict:
        """Resposta de review necessário"""
        self.log(f"⚠️  REVIEW: Score {match_score}%, faltam: {missing_items}", "warn")
        return {
            "card_id": listing_id,
            "decision": self.NEEDS_REVIEW,
            "submit_allowed": False,
            "match_score": match_score,
            "reason_codes": reason_codes,
            "missing_items": missing_items,
            "required_submission_fields": {},
            "payload_hash": self._compute_payload_hash({}, {}, artifacts),
            "human_approval_required": True,
        }


# ============================================================================
# EXAMPLE: Validar CHUTE para Superteam Brasil
# ============================================================================

def validate_chute_submission():
    """Valida submissão CHUTE para World Cup Hackathon"""

    builder = BuilderProfile(
        github_username="DGuedz",
        telegram="@doublegreen",
        min_reward_usdc=500,
        languages=["pt", "en"],
        regions=["BR"],
        skills=["react", "typescript", "solana", "web3", "python"],
        availability="full_time",
        authorized_repos=["DGuedz/chute-live-shots"],
    )

    opportunity = Opportunity(
        listing_id="superteam-brasil-world-cup-2026",
        title="World Cup Hackathon Brasil - Consumer and Fan Experiences",
        category="consumer",
        agent_eligibility="AGENT_ALLOWED",
        reward_usdc=700,  # 1º lugar
        required_fields={
            "repository_url": "required",
            "demo_video_5min": "required",
            "technical_docs": "required",
            "telegram": "required",
        },
        timestamp=datetime.now().isoformat(),
    )

    artifacts = DeliveryArtifacts(
        repository_url="https://github.com/DGuedz/chute-live-shots",
        demo_url="https://loom.com/share/YOUR_CHUTE_DEMO",  # TODO: adicionar URL real
        video_url="https://loom.com/share/YOUR_CHUTE_DEMO",
        docs_url="https://github.com/DGuedz/chute-live-shots/blob/feat/market-intel-skills-dogfood/HACKATHON_STATUS.md",
        telegram="@doublegreen",
        eligibility_answers={
            "how_many_team_members": "1",
            "what_is_your_hack": "CHUTE: bolão preditivo em tempo real com TxLINE + Solana on-chain",
            "did_you_use_txline": "Yes, as primary data source",
            "deployment_network": "mainnet",
        },
        ask_amount_usdc=700,
        tests_passing=True,
        license="MIT",
    )

    validator = MINDEarnValidator()
    result = validator.validate_submission(builder, opportunity, artifacts)

    print("\n" + "=" * 60)
    print("RESULT:")
    print(json.dumps(result, indent=2, default=str))
    print("=" * 60)

    return result


if __name__ == "__main__":
    result = validate_chute_submission()
    exit(0 if result["submit_allowed"] else 1)
