/** Adaptador de anuncios recompensados de la PWA. No se muestra ninguna publicidad falsa.
 * El futuro proveedor deberá registrar window.HRB_REWARDED_AD.show({placement})
 * y resolver {rewarded:true} únicamente al recibir confirmación de recompensa.
 * Sin proveedor, el bono queda pendiente, y se permiten compras de pago.
 */
export function hasRewardedAds(){return typeof window!=='undefined'&&typeof window.HRB_REWARDED_AD?.show==='function'}
export async function showRewardedAd(){if(!hasRewardedAds())return false;
 try {const receipt=await window.HRB_REWARDED_AD.show({placement:'bonus_skill'});return receipt?.rewarded===true;}
 catch(e){console.warn('Anuncio recompensado no completado',e);return false}
}