import{i as e,n as t,t as n}from"./jsx-runtime-BnxRlLMJ.js";import{c as r}from"./chunk-QFMPRPBF-CXL8OIgM.js";import{t as i}from"./api-BabT8kF8.js";import{n as a}from"./AuthContext-S735MBf5.js";import{n as o,t as s}from"./index-B3iqiIpA.js";import{t as ee}from"./Topbar-zjWuko-7.js";import{t as c}from"./Avatar-C9gYXSXQ.js";import{t as l}from"./Badge-D9SNkSyN.js";import{n as u}from"./utils-Bxf6mL76.js";import{t as te}from"./Modal-C5YyMLxb.js";import{t as ne}from"./TaskSidePanel-DSn-FIHN.js";var d=e(t(),1),f=n(),p=[`yellow`,`blue`,`pink`,`green`,`purple`,`orange`,`teal`,`indigo`,`cyan`,`red`];function m(e){return e?p[String(e).split(``).reduce((e,t)=>e+t.charCodeAt(0),0)%p.length]:`gray`}var h=[`Sun`,`Mon`,`Tue`,`Wed`,`Thu`,`Fri`,`Sat`],re=[`January`,`February`,`March`,`April`,`May`,`June`,`July`,`August`,`September`,`October`,`November`,`December`];function g(){let{user:e}=a(),{projects:t,selectedProject:n}=s(),p=o();r();let[g,_]=(0,d.useState)(null),[v,y]=(0,d.useState)(null),[b,x]=(0,d.useState)(`list`),[S,ie]=(0,d.useState)(``),[C,ae]=(0,d.useState)({field:`date`,dir:`asc`}),[w,oe]=(0,d.useState)(`date`),[T,se]=(0,d.useState)({status:``,project:``,assignee:``}),[E,D]=(0,d.useState)({collaborators:!0,projects:!0,visibility:!0}),[O,ce]=(0,d.useState)(!1),[k,A]=(0,d.useState)({}),[j,M]=(0,d.useState)({section:null,title:``,requirements:``,priority:`Medium`,deadline:``,assignee:`me`}),[le,N]=(0,d.useState)(!1),[P,F]=(0,d.useState)(()=>{let e=localStorage.getItem(`custom_task_statuses`);return e?JSON.parse(e):[]}),[ue,I]=(0,d.useState)(!1),[L,R]=(0,d.useState)(``),[de,z]=(0,d.useState)(null),[B,V]=(0,d.useState)(``),[H,U]=(0,d.useState)(null),[W,G]=(0,d.useState)(()=>{let e=new Date;return e.setDate(1),e.setHours(0,0,0,0),e});(0,d.useEffect)(()=>{q()},[t,n]);function K(e){M({section:e,title:``,requirements:``,priority:`Medium`,deadline:``,assignee:`me`})}async function q(){if(!t||t.length===0){_([]);return}try{_(n?(await i.tasks.list(n._id)).map(e=>({...e,projectRef:n}))||[]:(await i.tasks.dashboardOverview())?.tasks||[])}catch{p.error(`Failed to load tasks`),_([])}}async function J(e){if(!B.trim()){z(null);return}if(g.find(t=>t._id===e).title===B){z(null);return}_(t=>t.map(t=>t._id===e?{...t,title:B}:t));try{await i.tasks.update(e,{title:B}),p.success(`Task renamed`)}catch{p.error(`Failed to rename task`),q()}finally{z(null)}}async function fe(e,t){if(e.preventDefault(),!H)return;let n=g.find(e=>e._id===H);if(!(!n||n.status===t)){_(e=>e.map(e=>e._id===H?{...e,status:t}:e));try{await i.tasks.status(H,t)}catch{p.error(`Failed to move task`),q()}U(null)}}function Y(){if(!L.trim())return;let e=L.trim();if(P.includes(e)){p.error(`Status already exists`);return}let t=[...P,e];F(t),localStorage.setItem(`custom_task_statuses`,JSON.stringify(t)),R(``),I(!1),p.success(`Status "${e}" added`)}function pe(e){let t=P.filter(t=>t!==e);F(t),localStorage.setItem(`custom_task_statuses`,JSON.stringify(t)),p.success(`Status removed`)}async function X(r){if(!j.title.trim())return;let a=n||t[0];if(!a){p.error(`Join a project first`);return}let o=b===`board`?`status`:w,s={title:j.title.trim(),description:j.requirements.trim()||`Added from My Tasks`,assignedRole:`Developer`,assignedTo:j.assignee===`unassigned`?null:e._id,priority:j.priority||`Medium`};if(o===`date`){if(r===`today`)s.deadline=new Date().toISOString();else if(r===`nextWeek`){let e=new Date;e.setDate(e.getDate()+3),s.deadline=e.toISOString()}else if(r===`later`){let e=new Date;e.setDate(e.getDate()+14),s.deadline=e.toISOString()}}else o===`status`&&(s.status=r);try{j.deadline&&(s.deadline=new Date(j.deadline).toISOString()),await i.tasks.create(a._id,s),p.success(`Task added`),M({section:null,title:``,requirements:``,priority:`Medium`,deadline:``,assignee:`me`}),q()}catch{p.error(`Could not create task`)}}function Z(e,t){if(e.key===`Escape`){M({section:null,title:``,requirements:``,priority:`Medium`,deadline:``,assignee:`me`});return}e.key===`Enter`&&!e.shiftKey&&e.target?.name!==`requirements`&&(e.preventDefault(),X(t))}async function me(t){t.preventDefault();let n=new FormData(t.target),r=n.get(`projectId`);try{await i.tasks.create(r,{title:n.get(`title`),description:n.get(`description`),assignedRole:n.get(`role`)||`Member`,priority:n.get(`priority`)||`Medium`,status:n.get(`status`)||`Todo`,deadline:n.get(`deadline`)||void 0,assignedTo:e._id}),p.success(`Task created!`),N(!1),q()}catch(e){p.error(e.message)}}let Q=(0,d.useMemo)(()=>{let t=[...g||[]];return S&&(t=t.filter(e=>e.title.toLowerCase().includes(S.toLowerCase()))),O&&(t=t.filter(t=>t.assignedTo?._id===e._id||t.assignedTo===e._id)),T.status&&(t=t.filter(e=>e.status===T.status)),T.project&&(t=t.filter(e=>e.projectRef?._id===T.project)),T.assignee?T.assignee===`me`?t=t.filter(t=>t.assignedTo?._id===e._id||t.assignedTo===e._id):T.assignee===`unassigned`&&(t=t.filter(e=>!e.assignedTo)):!T.status&&b!==`calendar`&&(t=t.filter(e=>e.status!==`Done`&&e.status!==`Approved`)),t.sort((e,t)=>{let n,r;if(C.field===`name`)n=e.title.toLowerCase(),r=t.title.toLowerCase();else if(C.field===`priority`){let i={High:3,Medium:2,Low:1};n=i[e.priority]||0,r=i[t.priority]||0}else n=e.deadline?new Date(e.deadline).getTime():9999999999999,r=t.deadline?new Date(t.deadline).getTime():9999999999999;return n<r?C.dir===`asc`?-1:1:n>r?C.dir===`asc`?1:-1:0}),t},[g,S,T,C,e,b,O]),$=(0,d.useMemo)(()=>{let e=b===`board`?`status`:w,t=Q,n=[];if(e===`date`){let e=new Date;e.setHours(0,0,0,0);let r=new Date(e);r.setDate(r.getDate()+1);let i=new Date(e);i.setDate(i.getDate()+7);let a={recently:[],today:[],nextWeek:[],later:[]};t.forEach(e=>{if(!e.deadline)a.recently.push(e);else{let t=new Date(e.deadline);t.setHours(0,0,0,0),t<r?a.today.push(e):t<i?a.nextWeek.push(e):a.later.push(e)}}),n.push({id:`recently`,label:`Recently assigned`,tasks:a.recently}),n.push({id:`today`,label:`Do today`,tasks:a.today}),n.push({id:`nextWeek`,label:`Do next week`,tasks:a.nextWeek}),n.push({id:`later`,label:`Do later`,tasks:a.later})}else if(e===`status`){let e=[...[`Todo`,`In-Progress`,`Review`,`Done`,`Approved`],...P],r={};e.forEach(e=>r[e]=[]),t.forEach(e=>{r[e.status]?r[e.status].push(e):r.Todo.push(e)}),e.forEach(e=>n.push({id:e,label:e,tasks:r[e]}))}else if(e===`project`){let e={};t.forEach(t=>{let n=t.projectRef?._id||`none`;e[n]||(e[n]={id:n,label:t.projectRef?.title||`No Project`,tasks:[]}),e[n].tasks.push(t)}),n.push(...Object.values(e))}return n},[Q,w,P,b]),he=(0,d.useMemo)(()=>{if(b!==`calendar`)return[];let e=W.getFullYear(),t=W.getMonth(),n=new Date(e,t,1).getDay(),r=new Date(e,t+1,0).getDate(),i=new Date(e,t,0).getDate(),a=[];for(let r=n;r>0;r--)a.push({day:i-r+1,current:!1,dateStr:new Date(e,t-1,i-r+1).toDateString()});for(let n=1;n<=r;n++)a.push({day:n,current:!0,dateStr:new Date(e,t,n).toDateString()});let o=42-a.length;for(let n=1;n<=o;n++)a.push({day:n,current:!1,dateStr:new Date(e,t+1,n).toDateString()});let s={};return Q.forEach(e=>{if(e.deadline){let t=new Date(e.deadline).toDateString();s[t]||(s[t]=[]),s[t].push(e)}}),a.forEach(e=>{e.tasks=s[e.dateStr]||[]}),a},[W,Q,b]);return(0,f.jsxs)(f.Fragment,{children:[(0,f.jsx)(`style`,{children:`
        .hover-row:hover { background: rgba(0,0,0,.03); border-radius: 6px; }
        .toolbar { display: flex; gap: 12px; alignItems: center; padding: 12px 30px; background: var(--white); border-bottom: 1px solid var(--border); box-shadow: 0 2px 4px rgba(0,0,0,.02); flex-wrap: wrap; }
        .tool-btn { display: flex; align-items: center; gap: 8px; background: transparent; border: 1px solid var(--border); border-radius: 6px; padding: 6px 12px; font-size: .8rem; font-weight: 500; cursor: pointer; color: var(--text-secondary); transition: .2s; }
        .tool-btn:hover, .tool-btn.active { background: rgba(0,0,0,.03); color: var(--text); border-color: #d1d5db; }
        .board-col { background: var(--white); border-radius: 12px; min-width: 310px; max-width: 310px; padding: 14px; display: flex; flex-direction: column; gap: 10px; height: calc(100vh - 200px); overflow-y: auto; }
        .board-card { background: var(--white); border-radius: 8px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.08); cursor: grab; border: 1px solid var(--border); border-left: 5px solid var(--border); }
        .board-card:active { cursor: grabbing; opacity: 0.8; }
        .jira-board { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 12px; }
        .jira-col {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: 12px;
          min-width: 300px;
          max-width: 300px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          height: calc(100vh - 210px);
          overflow-y: auto;
          box-shadow: 0 1px 3px rgba(0,0,0,.06);
        }
        body.dark .jira-col {
          background: rgba(255,255,255,.04);
          border-color: rgba(255,255,255,.08);
        }
        .jira-col-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: .75rem;
          font-weight: 800;
          letter-spacing: .06em;
          color: var(--text-primary);
          text-transform: uppercase;
          margin-bottom: 4px;
          padding: 0 4px;
        }
        .jira-col-count {
          background: #f3f4f6;
          color: var(--text-muted);
          border-radius: 999px;
          padding: 2px 8px;
          font-size: .65rem;
          font-weight: 700;
        }
        body.dark .jira-col-count {
          background: rgba(255,255,255,.08);
          color: rgba(255,255,255,.6);
        }
        .jira-card {
          background: var(--white);
          border: 1px solid var(--border);
          border-left: 4px solid var(--blue);
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          cursor: grab;
          transition: all .2s;
          box-shadow: 0 1px 2px rgba(0,0,0,.04);
        }
        body.dark .jira-card {
          background: rgba(255,255,255,.03);
          border-color: rgba(255,255,255,.08);
        }
        .jira-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,.08);
          border-color: var(--border);
        }
        body.dark .jira-card:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,.3);
        }
        .jira-card:active { cursor: grabbing; }
        .jira-card-title {
          font-size: .9rem;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.4;
          word-break: break-word;
        }
        .jira-card-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: .75rem;
          color: var(--text-muted);
          gap: 8px;
        }
        .jira-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: 1px solid var(--border);
          border-radius: 5px;
          padding: 3px 7px;
          color: var(--text-secondary);
          background: #f9fafb;
          font-size: .7rem;
        }
        body.dark .jira-chip {
          background: rgba(255,255,255,.05);
          border-color: rgba(255,255,255,.08);
        }
        .jira-inline-add {
          border: 1.5px dashed var(--border);
          border-radius: 8px;
          padding: 12px;
          color: var(--text-secondary);
          font-size: .8rem;
          font-weight: 500;
          cursor: pointer;
          text-align: center;
          transition: .2s;
          background: var(--bg);
        }
        .jira-inline-add:hover {
          border-color: var(--blue);
          color: var(--blue);
          background: rgba(59,130,246,.04);
        }
        body.dark .jira-inline-add {
          background: rgba(255,255,255,.02);
          color: rgba(255,255,255,.5);
        }
        body.dark .jira-inline-add:hover {
          background: rgba(59,130,246,.1);
          border-color: var(--blue);
          color: var(--blue);
        }
        .jira-inline-editor {
          border: 1.5px solid var(--blue);
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: var(--bg);
        }
        body.dark .jira-inline-editor {
          background: rgba(59,130,246,.05);
        }
        .jira-inline-editor .form-input {
          background: var(--white);
          border-color: var(--border);
          color: var(--text-primary);
        }
        body.dark .jira-inline-editor .form-input {
          background: rgba(255,255,255,.08);
          border-color: rgba(255,255,255,.1);
          color: var(--text-primary);
        }
        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: var(--border); border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }
        .cal-header-cell { background: var(--white); padding: 10px; text-align: center; font-size: .75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
        .cal-cell { background: var(--white); min-height: 120px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
        .cal-cell.dim { background: var(--bg); }
        .cal-cell-day { font-size: .8rem; font-weight: 600; color: var(--text-muted); text-align: right; }
        .cal-task { font-size: .7rem; padding: 4px 6px; border-radius: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,.05); border-left: 3px solid transparent; }
        body.dark .hover-row:hover { background: rgba(255,255,255,.04); }
        body.dark .tool-btn:hover, body.dark .tool-btn.active { background: rgba(255,255,255,.06); color: var(--text-primary); border-color: #2f2f2f; }
        body.dark .toolbar { box-shadow: 0 2px 4px rgba(0,0,0,.12); }
        body.dark .cal-header-cell { background: rgba(255,255,255,.03); }
        body.dark .cal-cell.dim { background: rgba(255,255,255,.02); }
      `}),(0,f.jsx)(ee,{title:`My Tasks`}),(0,f.jsxs)(`div`,{className:`toolbar`,children:[(0,f.jsxs)(`div`,{style:{display:`flex`,gap:4},children:[(0,f.jsxs)(`button`,{className:`tool-btn ${b===`list`?`active`:``}`,onClick:()=>x(`list`),children:[(0,f.jsx)(`i`,{className:`fa-solid fa-list`}),` List`]}),(0,f.jsxs)(`button`,{className:`tool-btn ${b===`board`?`active`:``}`,onClick:()=>x(`board`),children:[(0,f.jsx)(`i`,{className:`fa-brands fa-trello`}),` Board`]}),(0,f.jsxs)(`button`,{className:`tool-btn ${b===`calendar`?`active`:``}`,onClick:()=>x(`calendar`),children:[(0,f.jsx)(`i`,{className:`fa-regular fa-calendar`}),` Calendar`]})]}),(0,f.jsx)(`div`,{style:{width:1,height:24,background:`var(--border)`,margin:`0 4px`}}),b!==`calendar`&&(0,f.jsxs)(f.Fragment,{children:[(0,f.jsxs)(`select`,{className:`tool-btn`,value:`${C.field}-${C.dir}`,onChange:e=>{let[t,n]=e.target.value.split(`-`);ae({field:t,dir:n})},children:[(0,f.jsx)(`option`,{value:`date-asc`,children:`Due Date (Asc)`}),(0,f.jsx)(`option`,{value:`date-desc`,children:`Due Date (Desc)`}),(0,f.jsx)(`option`,{value:`name-asc`,children:`Name (A-Z)`}),(0,f.jsx)(`option`,{value:`name-desc`,children:`Name (Z-A)`}),(0,f.jsx)(`option`,{value:`priority-desc`,children:`Priority`})]}),(0,f.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:6},children:[(0,f.jsx)(`span`,{style:{fontSize:`.8rem`,color:`var(--text-muted)`},children:`Group:`}),(0,f.jsxs)(`select`,{className:`tool-btn`,value:w,onChange:e=>oe(e.target.value),children:[(0,f.jsx)(`option`,{value:`date`,children:`Due Date`}),(0,f.jsx)(`option`,{value:`status`,children:`Status`}),(0,f.jsx)(`option`,{value:`project`,children:`Project`})]})]})]}),(0,f.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:6},children:[(0,f.jsx)(`span`,{style:{fontSize:`.8rem`,color:`var(--text-muted)`},children:`Assignee:`}),(0,f.jsxs)(`select`,{className:`tool-btn`,value:T.assignee,onChange:e=>se(t=>({...t,assignee:e.target.value})),children:[(0,f.jsx)(`option`,{value:``,children:`Everyone`}),(0,f.jsx)(`option`,{value:`me`,children:`Just Me`}),(0,f.jsx)(`option`,{value:`unassigned`,children:`Unassigned`})]})]}),(0,f.jsxs)(`button`,{className:`tool-btn ${O?`active`:``}`,onClick:()=>ce(e=>!e),children:[(0,f.jsx)(`i`,{className:`fa-solid fa-user`}),` `,O?`My tasks only`:`Show only my tasks`]}),(0,f.jsx)(`div`,{style:{flex:1}}),(0,f.jsxs)(`div`,{style:{position:`relative`,width:220},children:[(0,f.jsx)(`i`,{className:`fa-solid fa-search`,style:{position:`absolute`,left:10,top:9,color:`var(--text-muted)`,fontSize:`.8rem`}}),(0,f.jsx)(`input`,{type:`text`,className:`tool-btn`,placeholder:`Search tasks...`,value:S,onChange:e=>ie(e.target.value),style:{width:`100%`,paddingLeft:30,background:`#f9fafb`}})]}),b===`list`&&(0,f.jsxs)(`div`,{className:`tool-btn`,style:{position:`relative`},children:[(0,f.jsxs)(`label`,{style:{display:`flex`,gap:6,alignItems:`center`,cursor:`pointer`},children:[(0,f.jsx)(`input`,{type:`checkbox`,checked:E.collaborators,onChange:e=>D(t=>({...t,collaborators:e.target.checked}))}),` Team`]}),(0,f.jsxs)(`label`,{style:{display:`flex`,gap:6,alignItems:`center`,cursor:`pointer`},children:[(0,f.jsx)(`input`,{type:`checkbox`,checked:E.projects,onChange:e=>D(t=>({...t,projects:e.target.checked}))}),` Projects`]})]}),(0,f.jsxs)(`button`,{className:`btn btn--green btn--sm`,onClick:()=>N(!0),children:[(0,f.jsx)(`i`,{className:`fa-solid fa-plus`}),` Add Task`]})]}),(0,f.jsx)(`div`,{style:{padding:`20px 30px`,flex:1,overflow:`hidden`,display:`flex`,flexDirection:`column`},children:g===null?(0,f.jsx)(`div`,{className:`skeleton`,style:{height:200,borderRadius:12}}):b===`list`?(0,f.jsxs)(`div`,{style:{background:`var(--white)`,borderRadius:`var(--card-radius)`,boxShadow:`var(--shadow)`,display:`flex`,flexDirection:`column`,flex:1,overflow:`hidden`},children:[(0,f.jsxs)(`div`,{style:{display:`grid`,gridTemplateColumns:`minmax(250px, 3fr) 150px ${E.collaborators?`150px `:``}${E.projects?`200px `:``}120px`,gap:16,padding:`10px 10px 10px 34px`,borderBottom:`2px solid var(--border)`,fontSize:`.75rem`,fontWeight:600,color:`var(--text-secondary)`,textTransform:`uppercase`},children:[(0,f.jsx)(`div`,{children:`Name`}),(0,f.jsx)(`div`,{children:`Due date`}),E.collaborators&&(0,f.jsx)(`div`,{children:`Collaborators`}),E.projects&&(0,f.jsx)(`div`,{children:`Projects`}),E.visibility&&(0,f.jsx)(`div`,{children:`Visibility`})]}),(0,f.jsx)(`div`,{style:{overflowY:`auto`,padding:`10px 30px`},children:$.map(e=>(0,f.jsxs)(`div`,{style:{marginBottom:20},children:[(0,f.jsxs)(`div`,{onClick:()=>A(t=>({...t,[e.id]:!t[e.id]})),style:{display:`flex`,alignItems:`center`,gap:10,cursor:`pointer`,padding:`10px 0`,borderBottom:`1px solid var(--border)`},children:[(0,f.jsx)(`i`,{className:`fa-solid fa-chevron-${k[e.id]?`right`:`down`}`,style:{color:`var(--text-muted)`,fontSize:`.75rem`,width:14}}),(0,f.jsxs)(`h4`,{style:{margin:0,fontSize:`.95rem`,fontWeight:700},children:[e.label,` `,(0,f.jsxs)(`span`,{style:{color:`var(--text-muted)`,fontSize:`.75rem`,fontWeight:400},children:[`(`,e.tasks.length,`)`]})]})]}),!k[e.id]&&(0,f.jsxs)(`div`,{style:{paddingLeft:24,marginTop:4},children:[e.tasks.map(e=>{let t=m(e.projectRef?._id);return(0,f.jsxs)(`div`,{style:{display:`grid`,gridTemplateColumns:`minmax(250px, 3fr) 150px ${E.collaborators?`150px `:``}${E.projects?`200px `:``}120px`,gap:16,padding:`10px`,borderBottom:`1px solid var(--border)`,alignItems:`center`,cursor:`pointer`},className:`hover-row`,onClick:()=>y(e),children:[(0,f.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:12},children:[(0,f.jsx)(`div`,{className:`priority-dot priority-dot--${(e.priority||`low`).toLowerCase()}`}),de===e._id?(0,f.jsx)(`input`,{autoFocus:!0,type:`text`,value:B,onChange:e=>V(e.target.value),onBlur:()=>J(e._id),onKeyDown:t=>t.key===`Enter`&&J(e._id),style:{border:`1px solid var(--blue)`,borderRadius:4,padding:`2px 6px`,fontSize:`.875rem`}}):(0,f.jsx)(`span`,{style:{fontSize:`.875rem`,fontWeight:500,cursor:`text`},onClick:t=>{t.stopPropagation(),z(e._id),V(e.title)},children:e.title})]}),(0,f.jsx)(`div`,{style:{fontSize:`.8rem`,color:e.deadline&&new Date(e.deadline)<new Date?`#ef4444`:`var(--text-muted)`},children:e.deadline?u(e.deadline):`—`}),E.collaborators&&(0,f.jsx)(`div`,{children:e.assignedTo?(0,f.jsx)(c,{user:e.assignedTo,size:`sm`}):(0,f.jsx)(`span`,{style:{color:`var(--text-muted)`,fontSize:`.8rem`},children:`Unassigned`})}),E.projects&&(0,f.jsx)(`div`,{children:e.projectRef&&(0,f.jsx)(l,{variant:t,style:{fontSize:`.7rem`},children:e.projectRef.title})}),E.visibility&&(0,f.jsx)(`div`,{style:{fontSize:`.75rem`,color:`var(--text-muted)`},children:e.projectRef?.isPrivate?`Private`:`Workspace`})]},e._id)}),j.section===e.id?(0,f.jsxs)(`div`,{style:{padding:`10px 12px 12px 18px`,borderBottom:`1px solid var(--border)`,display:`flex`,flexDirection:`column`,gap:8},children:[(0,f.jsx)(`input`,{autoFocus:!0,type:`text`,value:j.title,onChange:t=>M(n=>({...n,section:e.id,title:t.target.value})),onKeyDown:t=>Z(t,e.id),placeholder:`Task name`,style:{border:`1px solid var(--border)`,borderRadius:8,padding:`8px 10px`,outline:`none`,width:`100%`,fontSize:`.875rem`}}),(0,f.jsx)(`textarea`,{name:`requirements`,value:j.requirements,onChange:e=>M(t=>({...t,requirements:e.target.value})),onKeyDown:t=>Z(t,e.id),placeholder:`Task requirements (optional)`,rows:2,style:{border:`1px solid var(--border)`,borderRadius:8,padding:`8px 10px`,outline:`none`,width:`100%`,fontSize:`.82rem`,resize:`vertical`}}),(0,f.jsxs)(`div`,{style:{display:`grid`,gridTemplateColumns:`1fr 1fr 1fr`,gap:8},children:[(0,f.jsxs)(`select`,{className:`form-input`,value:j.priority,onChange:e=>M(t=>({...t,priority:e.target.value})),style:{fontSize:`.78rem`,padding:`6px 8px`},children:[(0,f.jsx)(`option`,{value:`Low`,children:`Low`}),(0,f.jsx)(`option`,{value:`Medium`,children:`Medium`}),(0,f.jsx)(`option`,{value:`High`,children:`High`})]}),(0,f.jsx)(`input`,{type:`date`,className:`form-input`,value:j.deadline,onChange:e=>M(t=>({...t,deadline:e.target.value})),style:{fontSize:`.78rem`,padding:`6px 8px`}}),(0,f.jsxs)(`select`,{className:`form-input`,value:j.assignee,onChange:e=>M(t=>({...t,assignee:e.target.value})),style:{fontSize:`.78rem`,padding:`6px 8px`},children:[(0,f.jsx)(`option`,{value:`me`,children:`Collaboration: Me`}),(0,f.jsx)(`option`,{value:`unassigned`,children:`Collaboration: Unassigned`})]})]}),(0,f.jsxs)(`div`,{style:{display:`flex`,gap:8},children:[(0,f.jsx)(`button`,{type:`button`,className:`btn btn--green btn--sm`,onClick:()=>X(e.id),children:`Create`}),(0,f.jsx)(`button`,{type:`button`,className:`btn btn--ghost btn--sm`,onClick:()=>M({section:null,title:``,requirements:``,priority:`Medium`,deadline:``,assignee:`me`}),children:`Cancel`})]})]}):(0,f.jsx)(`div`,{onClick:()=>K(e.id),style:{padding:`10px 10px 10px 18px`,color:`var(--text-secondary)`,fontSize:`.85rem`,cursor:`pointer`},className:`hover-row`,children:`Add task...`})]})]},e.id))})]}):b===`board`?(0,f.jsxs)(`div`,{className:`jira-board`,style:{flex:1},children:[$.map(e=>(0,f.jsxs)(`div`,{className:`jira-col`,onDragOver:e=>e.preventDefault(),onDrop:t=>{t.currentTarget.classList.remove(`drag-over`),fe(t,e.id)},onDragEnter:e=>e.currentTarget.classList.add(`drag-over`),onDragLeave:e=>e.currentTarget.classList.remove(`drag-over`),children:[(0,f.jsxs)(`div`,{className:`jira-col-header`,children:[(0,f.jsx)(`div`,{children:e.label}),(0,f.jsx)(`div`,{style:{display:`flex`,alignItems:`center`,gap:6},children:(0,f.jsx)(`span`,{className:`jira-col-count`,children:e.tasks.length})})]}),e.tasks.map(e=>{let t=[`#3b82f6`,`#8b5cf6`,`#ef4444`,`#f97316`,`#22c55e`,`#ec4899`,`#14b8a6`,`#6366f1`],n=t[Math.abs(String(e._id).split(``).reduce((e,t)=>e+t.charCodeAt(0),0))%t.length];return(0,f.jsxs)(`div`,{className:`jira-card`,draggable:!0,onDragStart:t=>{U(e._id),t.dataTransfer.effectAllowed=`move`},onDragEnd:()=>U(null),onClick:()=>y(e),style:{borderLeftColor:n},children:[(0,f.jsx)(`div`,{className:`jira-card-title`,children:e.title}),(0,f.jsxs)(`div`,{className:`jira-card-meta`,children:[(0,f.jsx)(`div`,{children:e.deadline?(0,f.jsxs)(`span`,{className:`jira-chip`,children:[(0,f.jsx)(`i`,{className:`fa-regular fa-calendar`}),` `,u(e.deadline)]}):(0,f.jsxs)(`span`,{className:`jira-chip`,children:[(0,f.jsx)(`i`,{className:`fa-regular fa-calendar`}),` No date`]})}),(0,f.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:8},children:[(0,f.jsx)(`span`,{style:{textTransform:`uppercase`,fontSize:`.64rem`,color:`#9ca3af`},children:e.priority||`Medium`}),e.assignedTo?(0,f.jsx)(c,{user:e.assignedTo,size:`sm`,style:{width:22,height:22}}):(0,f.jsx)(`i`,{className:`fa-regular fa-user`,style:{color:`#6b7280`}})]})]})]},e._id)}),j.section===e.id?(0,f.jsxs)(`div`,{className:`jira-inline-editor`,children:[(0,f.jsx)(`input`,{autoFocus:!0,type:`text`,value:j.title,onChange:t=>M(n=>({...n,section:e.id,title:t.target.value})),onKeyDown:t=>Z(t,e.id),placeholder:`Task name`,className:`form-input`,style:{padding:`8px`,fontSize:`.8rem`}}),(0,f.jsx)(`textarea`,{name:`requirements`,value:j.requirements,onChange:e=>M(t=>({...t,requirements:e.target.value})),onKeyDown:t=>Z(t,e.id),placeholder:`Task requirements (optional)`,rows:2,className:`form-input`,style:{padding:`8px`,fontSize:`.78rem`,resize:`vertical`}}),(0,f.jsxs)(`div`,{style:{display:`grid`,gridTemplateColumns:`1fr 1fr`,gap:8},children:[(0,f.jsxs)(`select`,{className:`form-input`,value:j.priority,onChange:e=>M(t=>({...t,priority:e.target.value})),style:{padding:`6px 8px`,fontSize:`.75rem`},children:[(0,f.jsx)(`option`,{value:`Low`,children:`Low Priority`}),(0,f.jsx)(`option`,{value:`Medium`,children:`Medium Priority`}),(0,f.jsx)(`option`,{value:`High`,children:`High Priority`})]}),(0,f.jsx)(`input`,{type:`date`,className:`form-input`,value:j.deadline,onChange:e=>M(t=>({...t,deadline:e.target.value})),style:{padding:`6px 8px`,fontSize:`.75rem`}})]}),(0,f.jsxs)(`div`,{style:{display:`flex`,gap:8},children:[(0,f.jsx)(`button`,{type:`button`,className:`btn btn--green btn--sm`,onClick:()=>X(e.id),children:`Create`}),(0,f.jsx)(`button`,{type:`button`,className:`btn btn--ghost btn--sm`,onClick:()=>M({section:null,title:``,requirements:``,priority:`Medium`,deadline:``,assignee:`me`}),children:`Cancel`})]})]}):(0,f.jsx)(`div`,{className:`jira-inline-add`,onClick:()=>K(e.id),children:`+ Add task...`})]},e.id)),b!==`calendar`&&(0,f.jsxs)(`div`,{style:{background:`var(--bg)`,border:`2px dashed var(--border)`,borderRadius:12,minWidth:300,maxWidth:300,padding:12,display:`flex`,flexDirection:`column`,gap:10,height:`calc(100vh - 210px)`,overflow:`y-auto`,alignItems:`center`,justifyContent:`flex-start`},children:[(0,f.jsx)(`div`,{style:{paddingTop:20,textAlign:`center`,width:`100%`},children:ue?(0,f.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:8},children:[(0,f.jsx)(`input`,{autoFocus:!0,type:`text`,className:`form-input`,placeholder:`Status name...`,value:L,onChange:e=>R(e.target.value),onKeyDown:e=>{e.key===`Enter`&&Y(),e.key===`Escape`&&(I(!1),R(``))},style:{padding:`8px`,fontSize:`.85rem`}}),(0,f.jsxs)(`div`,{style:{display:`flex`,gap:8,justifyContent:`center`},children:[(0,f.jsx)(`button`,{className:`btn btn--sm btn--primary`,onClick:Y,children:`Add`}),(0,f.jsx)(`button`,{className:`btn btn--sm btn--ghost`,onClick:()=>{I(!1),R(``)},children:`Cancel`})]})]}):(0,f.jsxs)(`button`,{className:`btn btn--sm btn--outline`,onClick:()=>I(!0),style:{whiteSpace:`nowrap`},children:[(0,f.jsx)(`i`,{className:`fa-solid fa-plus`}),` Add Status`]})}),P.length>0&&(0,f.jsxs)(`div`,{style:{width:`100%`,paddingTop:12,borderTop:`1px solid var(--border)`,marginTop:8},children:[(0,f.jsx)(`div`,{style:{fontSize:`.7rem`,fontWeight:700,color:`var(--text-muted)`,marginBottom:8,textTransform:`uppercase`},children:`Custom Statuses`}),(0,f.jsx)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:8},children:P.map(e=>(0,f.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,justifyContent:`space-between`,padding:`6px 8px`,background:`var(--white)`,border:`1px solid var(--border)`,borderRadius:6,fontSize:`.8rem`},children:[(0,f.jsx)(`span`,{children:e}),(0,f.jsx)(`button`,{onClick:()=>pe(e),style:{background:`none`,border:`none`,color:`var(--text-muted)`,cursor:`pointer`,padding:0,fontSize:`.75rem`},title:`Delete status`,children:(0,f.jsx)(`i`,{className:`fa-solid fa-trash-can`})})]},e))})]})]})]}):(0,f.jsxs)(`div`,{style:{background:`var(--white)`,borderRadius:`var(--card-radius)`,boxShadow:`var(--shadow)`,padding:16,flex:1,display:`flex`,flexDirection:`column`,overflow:`hidden`},children:[(0,f.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,alignItems:`center`,marginBottom:16},children:[(0,f.jsxs)(`h3`,{style:{margin:0},children:[re[W.getMonth()],` `,W.getFullYear()]}),(0,f.jsxs)(`div`,{style:{display:`flex`,gap:6},children:[(0,f.jsx)(`button`,{className:`btn btn--sm btn--outline`,onClick:()=>G(e=>new Date(e.getFullYear(),e.getMonth()-1,1)),children:(0,f.jsx)(`i`,{className:`fa-solid fa-chevron-left`})}),(0,f.jsx)(`button`,{className:`btn btn--sm btn--outline`,onClick:()=>G(new Date),children:`Today`}),(0,f.jsx)(`button`,{className:`btn btn--sm btn--outline`,onClick:()=>G(e=>new Date(e.getFullYear(),e.getMonth()+1,1)),children:(0,f.jsx)(`i`,{className:`fa-solid fa-chevron-right`})})]})]}),(0,f.jsxs)(`div`,{className:`calendar-grid`,style:{flex:1},children:[h.map(e=>(0,f.jsx)(`div`,{className:`cal-header-cell`,children:e},e)),he.map((e,t)=>(0,f.jsxs)(`div`,{className:`cal-cell ${e.current?``:`dim`}`,children:[(0,f.jsx)(`div`,{className:`cal-cell-day`,style:{color:e.current?`var(--text)`:`var(--text-muted)`,fontWeight:e.dateStr===new Date().toDateString()?800:600},children:e.day}),(0,f.jsx)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:4,overflowY:`auto`},children:e.tasks.map(e=>{let t=m(e.projectRef?._id);return(0,f.jsxs)(`div`,{className:`cal-task`,onClick:()=>y(e),style:{background:`var(--${t}-bg)`,color:`var(--${t}-dark, var(--text))`,borderLeftColor:`var(--${t})`},title:e.title,children:[(0,f.jsx)(`div`,{className:`priority-dot priority-dot--${(e.priority||`low`).toLowerCase()}`,style:{display:`inline-block`,marginRight:4}}),e.title]},e._id)})})]},t))]})]})}),v&&(0,f.jsx)(ne,{task:v,onClose:()=>{y(null),q()},isOwner:!1,isMember:!0,userId:e?._id,projectId:v.projectRef?._id||v.project,onTaskUpdate:e=>{_(t=>t.map(t=>t._id===e._id?{...t,...e}:t)),y(t=>t?._id===e._id?{...t,...e}:t)}}),(0,f.jsx)(te,{open:le,onClose:()=>N(!1),title:`Add Task`,children:(0,f.jsxs)(`form`,{onSubmit:me,style:{display:`flex`,flexDirection:`column`,gap:16},children:[(0,f.jsxs)(`div`,{className:`form-group`,children:[(0,f.jsx)(`label`,{className:`form-label`,children:`Project *`}),(0,f.jsx)(`select`,{name:`projectId`,className:`form-input`,required:!0,defaultValue:n?._id||``,children:(t||[]).map(e=>(0,f.jsx)(`option`,{value:e._id,children:e.title},e._id))})]}),(0,f.jsxs)(`div`,{className:`form-group`,children:[(0,f.jsx)(`label`,{className:`form-label`,children:`Task Title *`}),(0,f.jsx)(`input`,{name:`title`,className:`form-input`,required:!0,placeholder:`What needs to be done?`})]}),(0,f.jsxs)(`div`,{className:`form-group`,children:[(0,f.jsx)(`label`,{className:`form-label`,children:`Description`}),(0,f.jsx)(`textarea`,{name:`description`,className:`form-input`,rows:2,placeholder:`Add task details and requirements...`,style:{resize:`vertical`}})]}),(0,f.jsxs)(`div`,{style:{display:`grid`,gridTemplateColumns:`1fr 1fr`,gap:12},children:[(0,f.jsxs)(`div`,{className:`form-group`,children:[(0,f.jsx)(`label`,{className:`form-label`,children:`Priority`}),(0,f.jsxs)(`select`,{name:`priority`,className:`form-input`,children:[(0,f.jsx)(`option`,{value:`Low`,children:`Low`}),(0,f.jsx)(`option`,{defaultValue:!0,value:`Medium`,children:`Medium`}),(0,f.jsx)(`option`,{value:`High`,children:`High`})]})]}),(0,f.jsxs)(`div`,{className:`form-group`,children:[(0,f.jsx)(`label`,{className:`form-label`,children:`Status`}),(0,f.jsxs)(`select`,{name:`status`,className:`form-input`,children:[(0,f.jsx)(`option`,{value:`Todo`,children:`To Do`}),(0,f.jsx)(`option`,{value:`In-Progress`,children:`In Progress`}),(0,f.jsx)(`option`,{value:`Review`,children:`Review`}),(0,f.jsx)(`option`,{value:`Done`,children:`Done`})]})]})]}),(0,f.jsxs)(`div`,{style:{display:`grid`,gridTemplateColumns:`1fr 1fr`,gap:12},children:[(0,f.jsxs)(`div`,{className:`form-group`,children:[(0,f.jsx)(`label`,{className:`form-label`,children:`Deadline`}),(0,f.jsx)(`input`,{name:`deadline`,className:`form-input`,type:`date`})]}),(0,f.jsxs)(`div`,{className:`form-group`,children:[(0,f.jsx)(`label`,{className:`form-label`,children:`Role`}),(0,f.jsx)(`input`,{name:`role`,className:`form-input`,placeholder:`e.g. Developer`})]})]}),(0,f.jsx)(`button`,{className:`btn btn--primary`,style:{width:`100%`,marginTop:8},children:`Create Task`})]})})]})}export{g as default};