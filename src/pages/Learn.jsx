// Danh sách mọi bài học, chia theo độ khó.
import React from 'react';
import Icon from '../components/Icon.jsx';
import { useApp } from '../ctx.js';
import { MODES, GROUPS } from '../modes.js';

export default function Learn() {
  const { go } = useApp();
  return (
    <div className="page">
      <div className="page-head"><h1 className="il"><Icon name="tat-ca-bai-hoc" size={40} /> Bài học</h1><p>Mới học thì bắt đầu ở Bước 1. Khi đã quen từ thì chuyển sang bước sau.</p></div>
      {GROUPS.map(g => (
        <section key={g.id} className="lgroup">
          <div className="lg-head"><span className={'badge ' + g.id}>{g.short}</span><h3>{g.name}</h3><small>{g.desc}</small></div>
          <div className="modes">
            {MODES.filter(m => m.group === g.id).map(m => (
              <button key={m.id} className={'mode ' + g.id} onClick={() => go(m.id)}>
                <span className="micon"><Icon name={m.ico} size={40} /></span>
                <span><b>{m.name}</b><small>{m.desc}</small></span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
