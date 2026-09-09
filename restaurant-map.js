(() => {
  const CENTER = { lat: 25.0530283, lng: 121.5383134 };
  const canvas = document.querySelector('#restaurantMapCanvas');
  const status = document.querySelector('#restaurantMapStatus');
  const open = document.querySelector('#openRestaurantMap');
  const center = document.querySelector('#centerRestaurantMap');
  const fit = document.querySelector('#fitRestaurantMap');
  let map, info, markers = [], filtered = [], loading = false, timer;
  const position = item => {
    const lat = item.location?.latitude, lng = item.location?.longitude;
    return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 21 && lat <= 26.5 && lng >= 119 && lng <= 123 ? {lat,lng} : null;
  };
  function note() {
    const count = filtered.filter(item=>position(item)).length;
    status.textContent = `${map ? '已標示' : '可定位'} ${count} 間；${filtered.length-count} 間座標待確認。中心：南京東路三段89巷附近。`;
  }
  function popup(item) {
    const root = document.createElement('div'); root.className='restaurant-map-popup';
    const title = document.createElement('h3'); title.textContent=item.name; root.append(title);
    for (const value of [item.area, `${item.cuisine} · ${item.price}`, item.googleRating || 'Google 評分待確認', item.why]) {
      const p = document.createElement('p'); p.textContent=value; root.append(p);
    }
    if (item.businessStatus==='CLOSED_TEMPORARILY') {
      const warning=document.createElement('strong');warning.textContent='Google 標示暫時停業';root.append(warning);
    }
    for (const [label,mode] of [['步行導航','walking'],['開車導航','driving']]) {
      const params=new URLSearchParams({api:'1',origin:'台北市南京東路三段89巷',destination:item.destination,travelmode:mode});
      if(item.placeId)params.set('destination_place_id',item.placeId);
      const a=document.createElement('a');a.textContent=label;a.href=`https://www.google.com/maps/dir/?${params}`;a.target='_blank';a.rel='noopener noreferrer';root.append(a);
    }
    const maps=document.createElement('a');maps.textContent='Google Maps 商家';
    const params=new URLSearchParams({api:'1',query:item.destination});if(item.placeId)params.set('query_place_id',item.placeId);
    maps.href=`https://www.google.com/maps/search/?${params}`;maps.target='_blank';maps.rel='noopener noreferrer';root.append(maps);
    return root;
  }
  function redraw() {
    if(!map)return;
    info.close();
    for(const marker of markers) marker.map=null;
    markers=[];
    for(const item of filtered) {
      const point=position(item);if(!point)continue;
      const marker=new google.maps.marker.AdvancedMarkerElement({map,position:point,title:item.name});
      marker.addListener('click',()=>{info.setContent(popup(item));info.open({map,anchor:marker});});
      markers.push(marker);
    }
    canvas.dataset.markerCount=String(markers.length);
    fit.disabled=!markers.length;note();
  }
  function fail() {
    clearTimeout(timer);loading=false;
    status.textContent='Google 地圖暫時無法載入，請稍後重試；餐廳清單與導航連結仍可使用。';
    open.disabled=false;open.hidden=false;open.textContent='重試地圖';center.hidden=true;fit.hidden=true;map=null;
  }
  window.gm_authFailure=fail;
  window.initRestaurantGoogleMap=()=>{
    clearTimeout(timer);
    try {
      map=new google.maps.Map(canvas,{center:CENTER,zoom:15,mapId:'DEMO_MAP_ID',gestureHandling:'cooperative',mapTypeControl:false,streetViewControl:false,fullscreenControl:true,clickableIcons:false});
      info=new google.maps.InfoWindow({maxWidth:Math.min(310,canvas.clientWidth-90),maxHeight:canvas.clientWidth<600?230:350});
      const pin=new google.maps.marker.PinElement({background:'#2465ab',borderColor:'#164773',glyphColor:'#fff',glyphText:'起'});
      const origin=new google.maps.marker.AdvancedMarkerElement({map,position:CENTER,title:'南京東路三段89巷附近（中心點）'});origin.append(pin);
      origin.addListener('click',()=>{info.setContent('南京東路三段89巷附近（估計中心）');info.open({map,anchor:origin});});
      loading=false;open.disabled=false;open.textContent='收合地圖';center.hidden=false;fit.hidden=false;redraw();
    }catch(error){fail();}
  };
  open.addEventListener('click',()=>{
    if(loading)return;
    if(map){
      canvas.hidden=!canvas.hidden;center.hidden=canvas.hidden;fit.hidden=canvas.hidden;
      open.textContent=canvas.hidden?'開啟地圖':'收合地圖';open.setAttribute('aria-expanded',String(!canvas.hidden));
      if(!canvas.hidden)google.maps.event.trigger(map,'resize');
      return;
    }
    canvas.replaceChildren();
    loading=true;open.disabled=true;open.setAttribute('aria-expanded','true');canvas.hidden=false;status.textContent='Google 地圖載入中…';
    if(window.google?.maps?.marker){window.initRestaurantGoogleMap();return;}
    document.querySelector('#restaurantGoogleMapsScript')?.remove();
    const script=document.createElement('script');script.id='restaurantGoogleMapsScript';script.async=true;
    script.src=`https://maps.googleapis.com/maps/api/js?${new URLSearchParams({key:window.restaurantMapConfig.key,callback:'initRestaurantGoogleMap',loading:'async',libraries:'marker',v:'weekly',language:'zh-TW',region:'TW',auth_referrer_policy:'origin'})}`;
    script.onerror=fail;timer=setTimeout(fail,20000);document.head.append(script);
  });
  center.addEventListener('click',()=>{if(map){info.close();map.setCenter(CENTER);map.setZoom(15);}});
  fit.addEventListener('click',()=>{
    if(!map || !markers.length)return;
    const bounds=new google.maps.LatLngBounds();bounds.extend(CENTER);for(const marker of markers)bounds.extend(marker.position);
    map.fitBounds(bounds,40);
    google.maps.event.addListenerOnce(map,'idle',()=>{if(map.getZoom()>17)map.setZoom(17);});
  });
  window.restaurantMapView={update(items){filtered=items.filter(item=>item.businessStatus!=='CLOSED_PERMANENTLY');if(map)redraw();else if(!loading)note();}};
})();
