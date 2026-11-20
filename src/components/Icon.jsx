// Icon của dự án: ảnh PNG nền trong suốt ở public/icons/<tên>.png (người dùng tự vẽ).
import React from 'react';

const BASE = import.meta.env.BASE_URL + 'icons/';
export const iconUrl = name => BASE + name + '.png';

export default function Icon({ name, size = 24, className = '', alt = '', title }) {
  return (
    <img className={'ico ' + className} src={iconUrl(name)} width={size} height={size} alt={alt} title={title}
      draggable="false" style={{ width: size, height: size }} />
  );
}
