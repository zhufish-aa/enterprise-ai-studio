import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import * as echarts from 'echarts';
import {query} from '@eas/platform-sdk/runtime';
import './style.css';

function App(){
 const container=useRef<HTMLDivElement>(null);
 const [state,setState]=useState('loading'),[revision,setRevision]=useState(0);
 useEffect(()=>{
  const abort=new AbortController();let chart:echarts.ECharts|undefined;
  const resize=new ResizeObserver(()=>chart?.resize());
  setState('loading');
  void query('sales_by_region',[],undefined,abort.signal).then(result=>{
   if(abort.signal.aborted||!container.current)return;
   const x=result.columns.findIndex(c=>c.key==='region'),y=result.columns.findIndex(c=>c.key==='sales_total');
   if(x<0||y<0)throw new Error('QUERY_COLUMNS_MISSING');
   if(!result.rows.length){setState('empty');return;}
   chart=echarts.init(container.current);resize.observe(container.current);
   chart.setOption({color:['#525bdf'],grid:{left:72,right:24,top:24,bottom:44},tooltip:{trigger:'axis',renderMode:'richText'},xAxis:{type:'category',data:result.rows.map(row=>String(row[x]??''))},yAxis:{type:'value',name:'销售额（按授权口径）'},series:[{type:'bar',barMaxWidth:48,data:result.rows.map(row=>Number(row[y]??0)),itemStyle:{borderRadius:[5,5,0,0]}}]});
   setState(result.truncated?'truncated':'ready');
  }).catch(()=>{if(!abort.signal.aborted)setState('error');});
  return()=>{abort.abort();resize.disconnect();chart?.dispose();};
 },[revision]);
 return <main><header><div><p>销售分析 · 测试预览</p><h1>区域销售表现</h1></div><button onClick={()=>setRevision(n=>n+1)}>刷新数据</button></header><section aria-busy={state==='loading'}><h2>各区域销售额</h2><div className="chart" ref={container} style={{display:state==='empty'||state==='error'?'none':'block'}}/>{state==='loading'&&<p role="status">正在读取授权测试数据…</p>}{state==='empty'&&<p>当前条件下没有数据，请调整筛选范围。</p>}{state==='error'&&<p role="alert">暂时无法获取数据，请检查数据授权后重试。</p>}{state==='truncated'&&<p>结果已截断，请缩小查询范围。</p>}</section></main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
