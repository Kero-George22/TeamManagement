import{a as e,n as t,t as n}from"./jsx-runtime-Bg_NI1en.js";import{n as r,r as i}from"./toast-BGGl2HVY.js";import{l as a}from"./chunk-QFMPRPBF-0msfw7bn.js";import{n as o}from"./AuthContext-CEwJSkyg.js";import{t as ee}from"./index.module-DkgOZS3A.js";var s=e(t(),1),c=n(),l=[{id:`Web Development`,icon:`fa-globe`,color:`#3b82f6`},{id:`Mobile Development`,icon:`fa-mobile-screen`,color:`#8b5cf6`},{id:`UI/UX Design`,icon:`fa-palette`,color:`#ec4899`},{id:`DevOps & Cloud`,icon:`fa-cloud`,color:`#06b6d4`},{id:`AI & Machine Learning`,icon:`fa-brain`,color:`#f59e0b`},{id:`Cybersecurity`,icon:`fa-shield-halved`,color:`#22c55e`},{id:`Blockchain`,icon:`fa-link`,color:`#f97316`},{id:`Data Science`,icon:`fa-chart-bar`,color:`#a855f7`},{id:`Game Development`,icon:`fa-gamepad`,color:`#ef4444`},{id:`Open Source`,icon:`fa-code`,color:`#14b8a6`}];function u({label:e,onRemove:t}){return(0,c.jsxs)(`span`,{className:`skill-tag`,children:[e,(0,c.jsx)(`button`,{onClick:()=>t(e),children:`×`}),(0,c.jsx)(`style`,{children:`.skill-tag { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; background: rgba(59,130,246,.08); color: #3b82f6; border-radius: 8px; font-size: .8rem; font-weight: 600; } .skill-tag button { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 1rem; line-height: 1; padding: 0; opacity: .6; } .skill-tag button:hover { opacity: 1; }`})]})}function d(){let{user:e,updateUser:t}=o(),n=a(),d=r(),f=(0,s.useRef)(null),[p,m]=(0,s.useState)(1),[h,g]=(0,s.useState)(``),[_,v]=(0,s.useState)(``),[y,b]=(0,s.useState)(!1),[x,S]=(0,s.useState)(null),[C,w]=(0,s.useState)(null),[T,E]=(0,s.useState)(!1),[D,O]=(0,s.useState)(null),[k,A]=(0,s.useState)({x:0,y:0}),[j,M]=(0,s.useState)(1),[N,P]=(0,s.useState)(null),[F,I]=(0,s.useState)(``),[L,R]=(0,s.useState)(``),[z,B]=(0,s.useState)([]),[V,H]=(0,s.useState)(``),[U,W]=(0,s.useState)([]);if((0,s.useEffect)(()=>{e?e.username&&n(`/app/dashboard`,{replace:!0}):n(`/app/login`,{replace:!0})},[e,n]),!e)return null;function G(){if(p===1){m(2);return}if(p===2){if(!h.trim()){v(`You need a name to continue`);return}v(``),m(3)}}function K(){p>1&&m(e=>e-1)}function q(e){let t=e.target.files?.[0];t&&(O(URL.createObjectURL(t)),M(1),A({x:0,y:0}),E(!0),e.target.value=null)}let J=(0,s.useCallback)((e,t)=>{P(t)},[]);async function Y(e,t){let n=new Image;n.src=e,await new Promise(e=>n.onload=e);let r=document.createElement(`canvas`);return r.width=t.width,r.height=t.height,r.getContext(`2d`).drawImage(n,t.x,t.y,t.width,t.height,0,0,t.width,t.height),new Promise(e=>{r.toBlob(t=>e(new File([t],`avatar.jpg`,{type:`image/jpeg`})),`image/jpeg`)})}async function X(){try{let e=await Y(D,N);S(e),w(URL.createObjectURL(e)),E(!1)}catch{d.error(`Failed to crop image`)}}function Z(){S(null),w(null)}function Q(e){if(e.key===`Enter`&&V.trim()){e.preventDefault();let t=V.trim();z.includes(t)||B(e=>[...e,t]),H(``)}}function te(e){B(t=>t.filter(t=>t!==e))}function ne(e){W(t=>t.includes(e)?t.filter(t=>t!==e):[...t,e])}async function $(){if(!h.trim()){v(`Username is required`),m(2);return}b(!0);try{let r=e.avatar||null;if(x){let e=await i.profile.uploadAvatar(x);r=(e?.user||e)?.avatar||r}let a=await i.profile.update({username:h.trim(),...L&&{headline:L},...F&&{bio:F},...z.length>0&&{skills:z}}),o=a?.user||a;r&&r!==o.avatar&&(o.avatar=r),t(o),d.success(`Welcome to TeamForge!`),n(`/app/dashboard`,{replace:!0})}catch(e){d.error(e.message||`Failed to save profile`)}finally{b(!1)}}return(0,c.jsxs)(`div`,{className:`onboard-page`,children:[(0,c.jsxs)(`div`,{className:`onboard-card`,children:[(0,c.jsxs)(`div`,{className:`onboard-progress`,children:[Array.from({length:3}).map((e,t)=>(0,c.jsx)(`div`,{className:`onboard-step-dot ${t+1<=p?`active`:``} ${t+1<p?`done`:``}`,children:t+1<p?(0,c.jsx)(`i`,{className:`fa-solid fa-check`}):t+1},t)),(0,c.jsx)(`div`,{className:`onboard-progress-bar`,children:(0,c.jsx)(`div`,{className:`onboard-progress-fill`,style:{width:`${(p-1)/2*100}%`}})})]}),p===1&&(0,c.jsxs)(`div`,{className:`onboard-step`,children:[(0,c.jsx)(`div`,{className:`onboard-icon-wrap`,children:(0,c.jsx)(`i`,{className:`fa-solid fa-hand-wave`})}),(0,c.jsx)(`h1`,{className:`onboard-title`,children:`Welcome to TeamForge`}),(0,c.jsx)(`p`,{className:`onboard-desc`,children:`The platform where teams build together. Create projects, assign tasks, track progress, and collaborate in real time — all in one place.`}),(0,c.jsx)(`div`,{className:`onboard-features`,children:[{icon:`fa-list-check`,text:`Task & Project Management`},{icon:`fa-users`,text:`Team Collaboration`},{icon:`fa-chart-line`,text:`Progress Analytics`},{icon:`fa-message`,text:`Real-time Communication`}].map(e=>(0,c.jsxs)(`div`,{className:`onboard-feature-item`,children:[(0,c.jsx)(`span`,{className:`onboard-feature-icon`,children:(0,c.jsx)(`i`,{className:`fa-solid ${e.icon}`})}),(0,c.jsx)(`span`,{children:e.text})]},e.icon))}),(0,c.jsxs)(`button`,{className:`btn btn--primary btn--lg`,onClick:G,style:{marginTop:28,width:`100%`},children:[`Get Started `,(0,c.jsx)(`i`,{className:`fa-solid fa-arrow-right`})]})]}),p===2&&(0,c.jsxs)(`div`,{className:`onboard-step`,children:[(0,c.jsx)(`h2`,{className:`onboard-title`,style:{fontSize:`1.5rem`},children:`What should we call you?`}),(0,c.jsx)(`p`,{className:`onboard-desc`,children:`Choose a display name and optionally add a profile photo.`}),(0,c.jsxs)(`div`,{className:`onboard-avatar-section`,children:[(0,c.jsxs)(`div`,{className:`onboard-avatar-wrap`,onClick:()=>f.current?.click(),children:[C?(0,c.jsx)(`img`,{src:C,alt:`Avatar`,className:`onboard-avatar-img`}):e.avatar?(0,c.jsx)(`img`,{src:e.avatar,alt:`Avatar`,className:`onboard-avatar-img`}):(0,c.jsx)(`div`,{className:`onboard-avatar-placeholder`,children:(0,c.jsx)(`i`,{className:`fa-solid fa-camera`})}),(0,c.jsx)(`div`,{className:`onboard-avatar-overlay`,children:(0,c.jsx)(`i`,{className:`fa-solid fa-camera`})})]}),(0,c.jsx)(`input`,{ref:f,type:`file`,accept:`image/*`,style:{display:`none`},onChange:q}),C&&(0,c.jsxs)(`button`,{className:`onboard-remove-avatar`,onClick:Z,children:[(0,c.jsx)(`i`,{className:`fa-solid fa-xmark`}),` Remove`]})]}),(0,c.jsxs)(`div`,{className:`form-group`,style:{width:`100%`},children:[(0,c.jsx)(`label`,{className:`form-label`,children:`Display Name *`}),(0,c.jsx)(`input`,{className:`form-input ${_?`input--error`:``}`,placeholder:`e.g. Ahmed Ali`,value:h,onChange:e=>{g(e.target.value),v(``)},autoFocus:!0,maxLength:50}),_&&(0,c.jsx)(`div`,{className:`form-error`,children:_})]}),(0,c.jsxs)(`div`,{className:`onboard-step-actions`,children:[(0,c.jsx)(`button`,{className:`btn btn--ghost`,onClick:K,children:`Back`}),(0,c.jsxs)(`button`,{className:`btn btn--primary`,onClick:G,children:[`Continue `,(0,c.jsx)(`i`,{className:`fa-solid fa-arrow-right`})]})]})]}),p===3&&(0,c.jsxs)(`div`,{className:`onboard-step`,children:[(0,c.jsx)(`h2`,{className:`onboard-title`,style:{fontSize:`1.5rem`},children:`Tell us about yourself`}),(0,c.jsx)(`p`,{className:`onboard-desc`,children:`Add your skills and interests — or skip and do this later.`}),(0,c.jsxs)(`div`,{className:`form-group`,style:{width:`100%`},children:[(0,c.jsx)(`label`,{className:`form-label`,children:`Headline`}),(0,c.jsx)(`input`,{className:`form-input`,placeholder:`e.g. Full-Stack Developer`,value:L,onChange:e=>R(e.target.value),maxLength:120})]}),(0,c.jsxs)(`div`,{className:`form-group`,style:{width:`100%`},children:[(0,c.jsx)(`label`,{className:`form-label`,children:`Bio`}),(0,c.jsx)(`textarea`,{className:`form-input`,placeholder:`Write a short bio about yourself...`,value:F,onChange:e=>I(e.target.value),rows:3,maxLength:1e3,style:{resize:`vertical`}})]}),(0,c.jsxs)(`div`,{className:`form-group`,style:{width:`100%`},children:[(0,c.jsx)(`label`,{className:`form-label`,children:`Skills`}),(0,c.jsx)(`input`,{className:`form-input`,placeholder:`Type a skill and press Enter`,value:V,onChange:e=>H(e.target.value),onKeyDown:Q}),z.length>0&&(0,c.jsx)(`div`,{style:{display:`flex`,flexWrap:`wrap`,gap:6,marginTop:8},children:z.map(e=>(0,c.jsx)(u,{label:e,onRemove:te},e))})]}),(0,c.jsxs)(`div`,{className:`form-group`,style:{width:`100%`},children:[(0,c.jsx)(`label`,{className:`form-label`,children:`Interested Categories`}),(0,c.jsx)(`div`,{className:`onboard-categories`,children:l.map(e=>(0,c.jsxs)(`button`,{className:`onboard-cat-btn ${U.includes(e.id)?`active`:``}`,onClick:()=>ne(e.id),style:U.includes(e.id)?{borderColor:e.color,background:`${e.color}10`,color:e.color}:{},children:[(0,c.jsx)(`i`,{className:`fa-solid ${e.icon}`}),e.id]},e.id))})]}),(0,c.jsxs)(`div`,{className:`onboard-step-actions`,children:[(0,c.jsx)(`button`,{className:`btn btn--ghost`,onClick:K,children:`Back`}),(0,c.jsxs)(`div`,{style:{display:`flex`,gap:10},children:[(0,c.jsx)(`button`,{className:`btn btn--outline`,onClick:$,disabled:y,children:`Skip`}),(0,c.jsx)(`button`,{className:`btn btn--primary`,onClick:$,disabled:y,children:y?(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)(`i`,{className:`fa-solid fa-circle-notch fa-spin`}),` Saving...`]}):`Complete Setup`})]})]})]})]}),T&&(0,c.jsx)(`div`,{className:`onboard-crop-overlay`,onClick:()=>E(!1),children:(0,c.jsxs)(`div`,{className:`onboard-crop-modal`,onClick:e=>e.stopPropagation(),children:[(0,c.jsx)(`h3`,{style:{margin:`0 0 16px`,fontSize:`1.1rem`,fontWeight:700},children:`Crop your photo`}),(0,c.jsx)(`div`,{style:{position:`relative`,width:`100%`,height:280,background:`#000`,borderRadius:12,overflow:`hidden`},children:(0,c.jsx)(ee,{image:D,crop:k,zoom:j,aspect:1,cropShape:`round`,onCropChange:A,onZoomChange:M,onCropComplete:J})}),(0,c.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:12,marginTop:14},children:[(0,c.jsx)(`i`,{className:`fa-solid fa-minus`,style:{color:`var(--text-muted)`}}),(0,c.jsx)(`input`,{type:`range`,min:1,max:3,step:.1,value:j,onChange:e=>M(Number(e.target.value)),style:{flex:1}}),(0,c.jsx)(`i`,{className:`fa-solid fa-plus`,style:{color:`var(--text-muted)`}})]}),(0,c.jsxs)(`div`,{style:{display:`flex`,gap:10,justifyContent:`flex-end`,marginTop:16},children:[(0,c.jsx)(`button`,{className:`btn btn--ghost`,onClick:()=>E(!1),children:`Cancel`}),(0,c.jsx)(`button`,{className:`btn btn--primary`,onClick:X,children:`Save`})]})]})}),(0,c.jsx)(`style`,{children:`
        .onboard-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
          padding: 20px;
        }
        .onboard-card {
          width: 100%;
          max-width: 480px;
          background: #fff;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 4px 24px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.04);
        }
        /* Progress */
        .onboard-progress {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 32px;
          position: relative;
        }
        .onboard-progress-bar {
          position: absolute;
          top: 50%; left: 0; right: 0;
          height: 3px;
          background: #e2e8f0;
          border-radius: 99px;
          transform: translateY(-50%);
          z-index: 0;
        }
        .onboard-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          border-radius: 99px;
          transition: width .4s ease;
        }
        .onboard-step-dot {
          position: relative;
          z-index: 1;
          width: 32px; height: 32px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: .8rem; font-weight: 700;
          background: #e2e8f0;
          color: #94a3b8;
          transition: all .3s;
        }
        .onboard-step-dot.active {
          background: #3b82f6;
          color: #fff;
          box-shadow: 0 0 0 4px rgba(59,130,246,.15);
        }
        .onboard-step-dot.done {
          background: #22c55e;
          color: #fff;
        }
        /* Step content */
        .onboard-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: fadeSlideIn .35s ease;
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .onboard-icon-wrap {
          width: 72px; height: 72px;
          background: linear-gradient(135deg, rgba(59,130,246,.12), rgba(139,92,246,.12));
          border-radius: 24px;
          display: flex; align-items: center; justify-content: center;
          font-size: 2rem;
          margin-bottom: 20px;
          color: #3b82f6;
        }
        .onboard-title {
          margin: 0 0 8px;
          font-size: 1.8rem;
          font-weight: 800;
          text-align: center;
          color: var(--text-primary);
        }
        .onboard-desc {
          margin: 0 0 24px;
          color: var(--text-secondary);
          text-align: center;
          line-height: 1.6;
          font-size: .95rem;
        }
        .onboard-features {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }
        .onboard-feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: var(--bg);
          border-radius: 12px;
          font-size: .88rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .onboard-feature-icon {
          width: 32px; height: 32px;
          background: rgba(59,130,246,.08);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: #3b82f6;
          font-size: .85rem;
          flex-shrink: 0;
        }
        /* Avatar */
        .onboard-avatar-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        .onboard-avatar-wrap {
          position: relative;
          width: 100px; height: 100px;
          border-radius: 50%;
          cursor: pointer;
          overflow: hidden;
          border: 3px dashed var(--border);
          transition: all .2s;
        }
        .onboard-avatar-wrap:hover { border-color: #3b82f6; }
        .onboard-avatar-img {
          width: 100%; height: 100%;
          object-fit: cover;
        }
        .onboard-avatar-placeholder {
          width: 100%; height: 100%;
          background: var(--bg);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-muted);
          font-size: 1.5rem;
        }
        .onboard-avatar-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,.4);
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          font-size: 1.2rem;
          opacity: 0;
          transition: opacity .2s;
        }
        .onboard-avatar-wrap:hover .onboard-avatar-overlay { opacity: 1; }
        .onboard-remove-avatar {
          background: none;
          border: none;
          color: #ef4444;
          font-size: .78rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        /* Form fields */
        .form-group { margin-bottom: 16px; }
        .form-label { display: block; margin-bottom: 6px; font-weight: 700; font-size: .85rem; color: var(--text-primary); }
        .form-input { width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: 10px; font-size: .9rem; outline: none; transition: border-color .15s; background: var(--bg); color: var(--text-primary); box-sizing: border-box; }
        .form-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
        .form-input.input--error { border-color: #ef4444; }
        .form-error { color: #ef4444; font-size: .8rem; font-weight: 600; margin-top: 4px; }
        .onboard-step-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-top: 20px;
          gap: 12px;
        }
        /* Categories */
        .onboard-categories {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .onboard-cat-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: #fff;
          font-size: .8rem;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all .15s;
        }
        .onboard-cat-btn:hover { border-color: #cbd5e1; background: var(--bg); }
        /* Crop modal */
        .onboard-crop-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .onboard-crop-modal {
          background: #fff;
          border-radius: 20px;
          padding: 24px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 20px 60px rgba(0,0,0,.15);
        }
        @media (max-width: 480px) {
          .onboard-card { padding: 24px; border-radius: 16px; }
          .onboard-title { font-size: 1.3rem; }
        }
      `})]})}export{d as default};