// comfyui_prompt_selector.js
import { app } from "../../../scripts/app.js";

const DOM_H = 180;
const COLORS = { selP:"#295577", selV:"#336633", list:"#161616" };
const DEBUG = false;
const log = (...a)=>DEBUG&&console.log("[PromptSelector]",...a);

const css = (el, s)=>Object.assign(el.style, s);
const h = (t, props={}, ...kids)=>{ const e=document.createElement(t); for(const k in props){ if(k==="style") css(e,props[k]); else if(k.startsWith("on")) e[k]=props[k]; else e.setAttribute(k,props[k]); } for(const k of kids) e.append(k); return e; };
const btn = (t, title)=>h("button",{title,style:{marginLeft:"6px",border:"1px solid #555",background:"#333",color:"#ccc",padding:"0 4px",borderRadius:"3px",cursor:"pointer"}},t);
const editInline = (container, init, commit)=>{ const inp=h("input",{style:{width:"70%",font:"12px monospace",background:"#222",color:"#fff",border:"1px solid #666",padding:"2px 4px",marginLeft:"4px"}}); inp.value=init; container.replaceChildren(inp); inp.focus(); inp.select(); inp.onkeydown=e=>{ if(e.key==="Enter") inp.blur(); if(e.key==="Escape") container.textContent=init; }; inp.onblur=()=>{ const v=inp.value.trim(); if(!v){ container.textContent=init; return; } commit(v); }; };

app.registerExtension({
  name: "PromptSelector.DOMWidgetSolid.ResponsiveY.Clean",
  async nodeCreated(node) {
    if (node.comfyClass !== "PromptSelector") return;

    const wJson   = node.widgets.find(w=>w.name==="prompts_json");
    const wPrompt = node.widgets.find(w=>w.name==="prompt");
    if (!wJson || !wPrompt) return;

    let data={}, selP=null, selV=null;

    const sync = ()=>{ wJson.value = JSON.stringify(data,null,2); node.setDirtyCanvas(true); };
    wPrompt.callback = v=>{ if(selP&&selV&&data[selP]?.versions?.[selV]!=null){ data[selP].versions[selV]=v; sync(); } };

    // root
    const el = h("div",{style:{
      display:"grid", gridTemplateRows:"auto 1fr", gap:"6px",
      width:"100%", height:DOM_H+"px", padding:"6px", boxSizing:"border-box",
      font:"12px monospace", color:"#ccc", background:"transparent", minHeight:"0"
    }});

    // header
    const header = h("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",alignItems:"center",minHeight:"0"}},
      h("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",color:"#aaa",minWidth:"0"}},
        h("span",{},"Prompts"),
        btn("+","Add prompt")
      ),
      h("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",color:"#aaa",minWidth:"0"}},
        h("span",{},"Versions"),
        btn("+","Add version")
      )
    );

    // lists
    const boxStyle={height:"100%",overflowY:"auto",overflowX:"hidden",border:"1px solid #333",borderRadius:"4px",background:COLORS.list,padding:"2px 4px",minHeight:"0"};
    const body  = h("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",minHeight:"0"}});
    const promptList = h("div",{style:boxStyle});
    const versionList = h("div",{style:boxStyle});
    body.append(promptList, versionList);
    el.append(header, body);

    // mount
    const domW = node.addDOMWidget("PromptBrowser","custom",el,{serialize:false,hideOnZoom:false});
    const idxJson = node.widgets.indexOf(wJson);
    node.widgets.splice(node.widgets.indexOf(domW),1);
    node.widgets.splice(idxJson+1,0,domW);

    domW.computeSize = w=>[w,DOM_H];
    wJson.computeSize = w=>[w,90]; // top fixed; bottom (wPrompt) auto

    // UI
    const addPBtn = header.querySelector('button[title="Add prompt"]');
    const addVBtn = header.querySelector('button[title="Add version"]');

    const renderPrompts = ()=>{
      promptList.replaceChildren();
      for(const k of Object.keys(data).reverse()){
        const row = h("div",{style:{
          display:"grid",gridTemplateColumns:"1fr auto",columnGap:"6px",
          alignItems:"center",padding:"2px 4px",
          background: selP===k?COLORS.selP:"transparent",
          cursor:"pointer",whiteSpace:"nowrap",minWidth:"0"
        }});
        const label = h("span",{style:{minWidth:"0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}, k||"(empty)");
        label.onclick = ev=>{
          ev.stopPropagation();
          if(selP===k){
            editInline(label,k,v=>{
              if(v===k || v in data){ label.textContent=k; return; }
              const o=data[k]; delete data[k]; data[v]=o; if(selP===k) selP=v; renderAll(); sync();
            });
          } else { selP=k; selV=null; renderAll(); }
        };
        const del = btn("×","Delete prompt"); del.style.color="#f55";
        del.onclick = ev=>{ ev.stopPropagation(); delete data[k]; if(selP===k) selP=selV=null; renderAll(); sync(); };
        row.append(label, del);
        promptList.append(row);
      }
    };

    const renderVersions = ()=>{
      versionList.replaceChildren();
      if(!selP) return;
      const cur = data[selP] ||= {latest:"",versions:{}};
      for(const v of Object.keys(cur.versions||{}).reverse()){
        const isL = v===cur.latest;
        const row = h("div",{style:{
          display:"grid",gridTemplateColumns:"1fr auto",columnGap:"6px",
          alignItems:"center",padding:"2px 4px",
          background: selV===v?COLORS.selV:"transparent",
          cursor:"pointer",whiteSpace:"nowrap",minWidth:"0"
        }});
        const label = h("span",{style:{minWidth:"0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}, v||"(empty)");
        label.onclick = ev=>{
          ev.stopPropagation();
          if(selV===v){
            editInline(label,v,nv=>{
              if(nv===v || (nv in cur.versions)){ label.textContent=v; return; }
              const txt=cur.versions[v]; delete cur.versions[v]; cur.versions[nv]=txt;
              if(cur.latest===v) cur.latest=nv; selV=nv; renderAll(); sync();
            });
          } else { selV=v; wPrompt.value = cur.versions[v]||""; renderAll(); }
        };
        const right = h("span",{style:{display:"flex",gap:"6px",justifySelf:"end"}});
        const star = btn("★","Mark latest"); star.style.color = isL ? "#ff0" : "#888";
        star.onclick = ev=>{ ev.stopPropagation(); cur.latest=v; renderAll(); sync(); };
        const del  = btn("×","Delete version"); del.style.color="#f55";
        del.onclick = ev=>{ ev.stopPropagation(); delete cur.versions[v]; if(selV===v) selV=null; renderAll(); sync(); };
        right.append(star, del);
        row.append(label, right);
        versionList.append(row);
      }
    };

    const renderAll = ()=>{ renderPrompts(); renderVersions(); };

    addPBtn.onclick = ()=>{ data["New prompt"] = {latest:"",versions:{}}; renderAll(); sync(); };
    addVBtn.onclick = ()=>{ if(!selP) return; data[selP].versions ||= {}; data[selP].versions["New version"] = ""; renderAll(); sync(); };

    const refresh = ()=>{ try{ data=JSON.parse(wJson.value||"{}"); }catch{ data={}; } renderAll(); };
    wJson.callback = refresh; refresh();

    const oldRemove = node.onRemoved;
    node.onRemoved = function(){ try{ el.remove(); }catch{} oldRemove?.apply(this,arguments); };
  }
});
