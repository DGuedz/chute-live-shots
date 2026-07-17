import {init, miniApp, viewport} from '@telegram-apps/sdk-react';

/** Bootstraps Telegram Mini Apps capabilities without breaking local browser demos. */
export function bootTelegramMiniApp(){
  if(!window.Telegram?.WebApp)return false;
  try{
    init();
    miniApp.mountSync();
    miniApp.bindCssVars();
    viewport.mount();
    viewport.bindCssVars();
    miniApp.setHeaderColor('#09090B');
    miniApp.setBottomBarColor('#09090B');
    miniApp.ready();
    viewport.expand();
    return true;
  }catch(error){
    console.warn('Telegram Mini App SDK fallback:',error);
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
    return false;
  }
}
