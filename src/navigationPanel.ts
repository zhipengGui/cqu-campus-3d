import type {Navigator} from './navigation';
import type {SearchItem} from './search';
import type {RoadPoint} from './routing';

/** 转向语义 → 文案；默认中文。双语文案由 main 注入（避免本模块引入浏览器侧 i18n，
 *  保持 Node 单测可直接 import）。 */
export interface TurnLabels { back: string; left: string; right: string }
const ZH_TURNS: TurnLabels = { back: '前方折返', left: '前方左转', right: '前方右转' };

export function routeTurns(points:RoadPoint[],labels:TurnLabels=ZH_TURNS):string[] {
  const turns:string[]=[];
  for(let i=1;i<points.length-1;i++){
    const [a,b,c]=[points[i-1],points[i],points[i+1]],ix=b[0]-a[0],iy=b[1]-a[1],ox=c[0]-b[0],oy=c[1]-b[1];
    if(Math.hypot(ix,iy)<5||Math.hypot(ox,oy)<5)continue;
    const angle=Math.atan2(ix*oy-iy*ox,ix*ix+iy*iy)*180/Math.PI;
    if(Math.abs(angle)>150)turns.push(labels.back);else if(Math.abs(angle)>35)turns.push(angle>0?labels.left:labels.right);
  }return turns.slice(0,4);
}

/** 由 main 注入的本地化助手（i18n 模块依赖 DOM，不能在此直接 import）。 */
export interface PanelI18n {
  t: (key: string) => string;
  getLang: () => "zh" | "en";
  localName: (zh: string) => string;
  onLangChange: (cb: () => void) => void;
}

export function initNavigationPanel(nav:Navigator,places:SearchItem[],onRoute:()=>void,i18n?:PanelI18n):{rebuild:()=>void} {
  const get=<T extends HTMLElement>(id:string)=>document.querySelector<T>(id)!;
  const L=():PanelI18n=>i18n??{t:(k)=>({navStart:'起点',navEnd:'终点',navPickMap:'地图选点',navGo:'开始导航',navArrive:'到达附近道路',navPickStartHint:'点击道路或地点设置起点',navPickEndHint:'点击道路或地点设置终点'} as Record<string,string>)[k]??k,
    getLang:()=>'zh',localName:(n)=>n,onLangChange:()=>{}};
  const rebuildOptions=():void=>{
    for(const which of ['start','end'] as const){
      const select=get<HTMLSelectElement>('#nav-'+which);
      const keep=select.value;
      while(select.options.length>1)select.remove(1);
      for(const place of places.filter(p=>p.kind!=='water'))select.add(new Option(L().localName(place.name),place.name));
      select.value=keep;
      select.options[0].disabled=true;
    }
  };
  rebuildOptions();
  for(const which of ['start','end'] as const){
    const select=get<HTMLSelectElement>('#nav-'+which);
    select.addEventListener('change',()=>{const place=places.find(p=>p.name===select.value);if(place)nav.setPlace(which,place.name,place.target.x,place.target.z);refresh();});
    get('#nav-pick-'+which).addEventListener('click',()=>{nav.pickEndpoint=which;nav.onStatus(L().t(which==='start'?'navPickStartHint':'navPickEndHint'));refresh();});
  }
  function refresh():void {
    for(const which of ['start','end'] as const){
      const e=nav[which];get<HTMLSelectElement>('#nav-'+which).value=e?(e.place??'@map'):'';
      get('#nav-pick-'+which).classList.toggle('on',nav.pickEndpoint===which);
    }
    const label=(name:string)=>L().getLang()==='en'?L().localName(name):name;
    get('#nav-note').textContent=[nav.start?.place?label(nav.start.place):null,nav.end?.place?label(nav.end.place):null].filter(Boolean).join(' → ');
    get('#nav-turns').textContent=nav.result?[...routeTurns(nav.result.points,{back:L().t('turnBack'),left:L().t('turnLeft'),right:L().t('turnRight')}),L().t('navArrive')].join(' · '):'';
  }
  nav.onChange=()=>{refresh();const w=get<HTMLButtonElement>('#nav-walk');if(w)w.hidden=!nav.result;if(nav.result)onRoute();};
  get('#nav-swap').addEventListener('click',()=>nav.swap());
  get('#nav-go').addEventListener('click',()=>nav.recompute());
  L().onLangChange(()=>{rebuildOptions();refresh();});
  refresh();
  return {rebuild:()=>{rebuildOptions();refresh();}};
}
