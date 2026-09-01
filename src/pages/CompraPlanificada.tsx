import { useEffect, useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Title from '../components/ui/Title';
import type { DiaMenu } from '../data/Menusemanal';
import { generarCompraMercadona, type LineaCompra, type ResultadoCompra } from '../motor/compra';
import { obtenerSeccionCompra, ORDEN_SECCIONES_COMPRA } from '../services/categoriasCompra';

type Props = { menu: DiaMenu[]; menuMes: DiaMenu[]; mesActivo: string; semanaActiva: number };
type Periodo = 'semana' | 'mes';

const euros=(n:number)=>n.toLocaleString('es-ES',{style:'currency',currency:'EUR'});

export default function CompraPlanificada({menu,menuMes,mesActivo,semanaActiva}:Props){
 const [periodo,setPeriodo]=useState<Periodo>('semana');
 const [resultado,setResultado]=useState<ResultadoCompra|null>(null);
 const [cargando,setCargando]=useState(true);
 const [error,setError]=useState('');
 const menuObjetivo=periodo==='semana'?menu:menuMes;
 const clave=`pfi-compra-${periodo}-${mesActivo}-${periodo==='semana'?semanaActiva+1:'todo'}`;
 const [marcados,setMarcados]=useState<string[]>([]);
 useEffect(()=>{try{setMarcados(JSON.parse(localStorage.getItem(clave)||'[]'))}catch{setMarcados([])}},[clave]);
 useEffect(()=>{let activo=true;setCargando(true);setError('');generarCompraMercadona(menuObjetivo).then(r=>{if(activo)setResultado(r)}).catch(()=>{if(activo)setError('No se ha podido calcular la compra.')}).finally(()=>{if(activo)setCargando(false)});return()=>{activo=false}},[menuObjetivo,periodo,mesActivo,semanaActiva]);
 const lineas=resultado?.lineas??[];
 const secciones=useMemo(()=>Array.from(new Set(lineas.map(obtenerSeccionCompra))).sort((a,b)=>{const ia=ORDEN_SECCIONES_COMPRA.indexOf(a),ib=ORDEN_SECCIONES_COMPRA.indexOf(b);return (ia<0?999:ia)-(ib<0?999:ib)}),[lineas]);
 const cambiar=(linea:LineaCompra)=>{const nuevas=marcados.includes(linea.clave)?marcados.filter(x=>x!==linea.clave):[...marcados,linea.clave];setMarcados(nuevas);localStorage.setItem(clave,JSON.stringify(nuevas))};
 const total=lineas.reduce((s,l)=>s+(l.subtotal??0),0); const pendiente=lineas.reduce((s,l)=>s+(marcados.includes(l.clave)?0:(l.subtotal??0)),0);
 const mesTexto=new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(new Date(`${mesActivo}-01T12:00:00`));
 return <main className="page legacy-page" style={{maxWidth:1050,margin:'0 auto',padding:'20px 20px 118px'}}>
  <Card className="page-hero-card"><Title style={{color:'#4f6f52'}}>🛒 Planificación de compra</Title><p style={{color:'#667067'}}>El menú decide qué necesitas. Tú eliges si preparas la compra de esta semana o la visión completa del mes.</p>
   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,margin:'18px 0'}}><button type="button" onClick={()=>setPeriodo('semana')} style={boton(periodo==='semana')}>🥬 Esta semana</button><button type="button" onClick={()=>setPeriodo('mes')} style={boton(periodo==='mes')}>🧺 Todo el mes</button></div>
   <div style={{padding:'12px 14px',borderRadius:14,background:'#f8f6f2'}}><strong style={{display:'block',color:'#263229'}}>{periodo==='semana'?`Semana ${semanaActiva+1} · ${mesTexto}`:`Compra mensual · ${mesTexto}`}</strong><span style={{color:'#667067',fontSize:13}}>{periodo==='semana'?'Frescos y productos necesarios para el menú de la semana.':'Vista conjunta de las semanas en casa; las semanas excluidas no se cuentan.'}</span></div>
  </Card>
  {cargando&&<Card><p>Calculando compra…</p></Card>}{error&&<Card><p>{error}</p></Card>}
  {!cargando&&resultado&&<><Card><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,textAlign:'center'}}><Resumen valor={euros(total)} texto="total previsto"/><Resumen valor={String(lineas.length)} texto="productos"/><Resumen valor={euros(pendiente)} texto="pendiente"/></div></Card>
   {menuObjetivo.length===0&&<Card><Title style={{color:'#4f6f52'}}>🏖️ Semana fuera de casa</Title><p style={{color:'#667067'}}>No se generan productos del menú para esta semana.</p></Card>}
   {secciones.map(sec=><Card key={sec}><Title style={{color:'#4f6f52',fontSize:20}}>{sec}</Title>{lineas.filter(l=>obtenerSeccionCompra(l)===sec).map(l=><label key={l.clave} style={{display:'grid',gridTemplateColumns:'28px 1fr auto',gap:10,alignItems:'center',padding:'12px 0',borderBottom:'1px solid #e1e7df'}}><input type="checkbox" checked={marcados.includes(l.clave)} onChange={()=>cambiar(l)} style={{width:21,height:21,accentColor:'#4f6f52'}}/><span><strong style={{display:'block',textDecoration:marcados.includes(l.clave)?'line-through':'none'}}>{l.producto?.nombre??l.ingrediente.nombre}</strong><small style={{color:'#737b74'}}>{l.producto?.formato??(l.origen==='menu'?'Necesario para el menú':'Reposición de despensa')}</small></span><strong style={{color:'#4f6f52'}}>{l.subtotal===null?'—':euros(l.subtotal)}</strong></label>)}</Card>)}
  </>}
 </main>;
}
function Resumen({valor,texto}:{valor:string;texto:string}){return <div><strong style={{display:'block',fontSize:20,color:'#4f6f52'}}>{valor}</strong><span style={{fontSize:12,color:'#667067'}}>{texto}</span></div>}
function boton(activo:boolean){return {border:activo?'2px solid #4f6f52':'1px solid #d8dfd5',borderRadius:14,padding:'14px 10px',background:activo?'#e7eee4':'#fff',color:'#334c36',fontWeight:800,fontFamily:'inherit',cursor:'pointer'} as const}
