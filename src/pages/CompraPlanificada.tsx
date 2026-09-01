import { useEffect, useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Title from '../components/ui/Title';
import type { DiaMenu } from '../data/Menusemanal';
import type { LineaCompra, ResultadoCompra } from '../motor/compra';
import { obtenerSeccionCompra, ORDEN_SECCIONES_COMPRA } from '../services/categoriasCompra';
import { generarCompraMensual, generarCompraSemanalProyectada } from '../services/planificacionCompra';

type Props = { menu: DiaMenu[]; menuMes: DiaMenu[]; menusSemanas: DiaMenu[][]; mesActivo: string; semanaActiva: number };
type Periodo = 'semana' | 'mes';

const euros=(n:number)=>n.toLocaleString('es-ES',{style:'currency',currency:'EUR'});

export default function CompraPlanificada({menu,menuMes,menusSemanas,mesActivo,semanaActiva}:Props){
 const [periodo,setPeriodo]=useState<Periodo>('semana');
 const [resultado,setResultado]=useState<ResultadoCompra|null>(null);
 const [cargando,setCargando]=useState(true);
 const [error,setError]=useState('');
 const menuObjetivo=periodo==='semana'?menu:menuMes;
 const clave=`pfi-compra-${periodo}-${mesActivo}-${periodo==='semana'?semanaActiva+1:'todo'}`;
 const [marcados,setMarcados]=useState<string[]>([]);
 useEffect(()=>{try{setMarcados(JSON.parse(localStorage.getItem(clave)||'[]'))}catch{setMarcados([])}},[clave]);
 useEffect(()=>{if(semanaActiva!==0&&periodo==='mes')setPeriodo('semana')},[semanaActiva,periodo]);
 useEffect(()=>{let activo=true;setCargando(true);setError('');const calculo=periodo==='mes'?generarCompraMensual(menuMes):generarCompraSemanalProyectada(menusSemanas,semanaActiva);calculo.then(r=>{if(activo)setResultado(r)}).catch(()=>{if(activo)setError('No se ha podido calcular la compra.')}).finally(()=>{if(activo)setCargando(false)});return()=>{activo=false}},[menuMes,menusSemanas,periodo,mesActivo,semanaActiva]);
 const lineas=resultado?.lineas??[];
 const secciones=useMemo(()=>Array.from(new Set(lineas.map(obtenerSeccionCompra))).sort((a,b)=>{const ia=ORDEN_SECCIONES_COMPRA.indexOf(a),ib=ORDEN_SECCIONES_COMPRA.indexOf(b);return (ia<0?999:ia)-(ib<0?999:ib)}),[lineas]);
 const cambiar=(linea:LineaCompra)=>{const nuevas=marcados.includes(linea.clave)?marcados.filter(x=>x!==linea.clave):[...marcados,linea.clave];setMarcados(nuevas);localStorage.setItem(clave,JSON.stringify(nuevas))};
 const total=lineas.reduce((s,l)=>s+(l.subtotal??0),0); const pendiente=lineas.reduce((s,l)=>s+(marcados.includes(l.clave)?0:(l.subtotal??0)),0);
 const mesTexto=new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(new Date(`${mesActivo}-01T12:00:00`));
 return <main className="page legacy-page" style={{maxWidth:1050,margin:'0 auto',padding:'20px 20px 118px'}}>
  <Card className="page-hero-card"><Title style={{color:'#4f6f52'}}>🛒 Planificación de compra</Title><p style={{color:'#667067'}}>El menú decide qué necesitas. Tú eliges si preparas la compra de esta semana o la visión completa del mes.</p>
   <div style={{display:'grid',gridTemplateColumns:semanaActiva===0?'1fr 1fr':'1fr',gap:10,margin:'18px 0'}}><button type="button" onClick={()=>setPeriodo('semana')} style={boton(periodo==='semana')}>🥬 Compra semanal</button>{semanaActiva===0&&<button type="button" onClick={()=>setPeriodo('mes')} style={boton(periodo==='mes')}>🧺 Compra mensual</button>}</div>
   <div style={{padding:'12px 14px',borderRadius:14,background:'#f8f6f2'}}><strong style={{display:'block',color:'#263229'}}>{periodo==='semana'?`Semana ${semanaActiva+1} · ${mesTexto}`:`Compra mensual · ${mesTexto}`}</strong><span style={{color:'#667067',fontSize:13}}>{periodo==='semana'?'Fruta y verdura, carne y pescado. Los sobrantes de envases anteriores ya están descontados.':'Leche, despensa, embutido, salsas, desayuno, limpieza, mascotas y demás productos no frescos para todo el mes.'}</span></div>
  </Card>
  {cargando&&<Card><p>Calculando compra…</p></Card>}{error&&<Card><p>{error}</p></Card>}
  {!cargando&&resultado&&<><Card><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,textAlign:'center'}}><Resumen valor={euros(total)} texto="total previsto"/><Resumen valor={String(lineas.length)} texto="productos"/><Resumen valor={euros(pendiente)} texto="pendiente"/></div></Card>
   {menuObjetivo.length===0&&<Card><Title style={{color:'#4f6f52'}}>🏖️ Semana fuera de casa</Title><p style={{color:'#667067'}}>No se generan productos del menú para esta semana.</p></Card>}
   {secciones.map(sec=><Card key={sec}><Title style={{color:'#4f6f52',fontSize:20}}>{sec}</Title>{lineas.filter(l=>obtenerSeccionCompra(l)===sec).map(l=><label key={l.clave} style={{display:'grid',gridTemplateColumns:'28px 1fr auto',gap:10,alignItems:'center',padding:'12px 0',borderBottom:'1px solid #e1e7df'}}><input type="checkbox" checked={marcados.includes(l.clave)} onChange={()=>cambiar(l)} style={{width:21,height:21,accentColor:'#4f6f52'}}/><span><strong style={{display:'block',textDecoration:marcados.includes(l.clave)?'line-through':'none'}}>{l.producto?.nombre??l.ingrediente.nombre}</strong><small style={{color:'#737b74',display:'block'}}>{resumenNecesidades(l)}</small><small style={{color:'#737b74'}}>{l.producto ? `${l.envases} envase${l.envases===1?'':'s'} · ${l.producto.formato}` : 'Falta elegir el producto exacto'}</small></span><strong style={{color:'#4f6f52'}}>{l.subtotal===null?'—':euros(l.subtotal)}</strong></label>)}</Card>)}
   {periodo==='semana'&&resultado.lineasCubiertas&&resultado.lineasCubiertas.length>0&&<Card><Title style={{color:'#4f6f52',fontSize:20}}>✅ Ya cubierto con lo que queda</Title><p style={{color:'#667067'}}>No necesitas volver a comprar estos productos esta semana porque sobra cantidad de envases anteriores.</p>{resultado.lineasCubiertas.map(l=><div key={l.clave} style={{padding:'9px 0',borderBottom:'1px solid #e1e7df'}}><strong>{l.producto?.nombre??l.ingrediente.nombre}</strong><small style={{display:'block',color:'#737b74'}}>{resumenNecesidades(l)}</small></div>)}</Card>}
  </>}
 </main>;
}
function Resumen({valor,texto}:{valor:string;texto:string}){return <div><strong style={{display:'block',fontSize:20,color:'#4f6f52'}}>{valor}</strong><span style={{fontSize:12,color:'#667067'}}>{texto}</span></div>}
function resumenNecesidades(linea:LineaCompra){return linea.necesidades.map(n=>`${formatear(n.cantidad)} ${n.unidad} de ${n.nombre}`).join(' + ')}
function formatear(valor:number){return valor.toLocaleString('es-ES',{maximumFractionDigits:2})}
function boton(activo:boolean){return {border:activo?'2px solid #4f6f52':'1px solid #d8dfd5',borderRadius:14,padding:'14px 10px',background:activo?'#e7eee4':'#fff',color:'#334c36',fontWeight:800,fontFamily:'inherit',cursor:'pointer'} as const}
