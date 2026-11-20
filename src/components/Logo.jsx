// Logo TypeLingo (người dùng vẽ) ở public/logo/.
//   variant="full": logo ngang (mèo + chữ), tự đổi bản sáng/tối theo theme, có bản @2x cho màn hình nét.
//   variant="icon": chỉ hình mèo vuông.
import React from 'react';
import { useApp } from '../ctx.js';

const BASE = import.meta.env.BASE_URL + 'logo/';

export default function Logo({ variant = 'full', height = 40, className = '' }) {
  const { theme } = useApp();
  if (variant === 'icon') {
    return <img className={'logo-icon ' + className} src={BASE + 'logo-icon-128.png'} srcSet={`${BASE}logo-icon-64.png 1x, ${BASE}logo-icon-128.png 2x`}
      width={height} height={height} alt="TypeLingo" draggable="false" />;
  }
  const v = theme === 'dark' ? 'dark' : 'light';
  return <img className={'logo-full ' + className} src={`${BASE}logo-horizontal-${v}.png`} srcSet={`${BASE}logo-horizontal-${v}.png 1x, ${BASE}logo-horizontal-${v}@2x.png 2x`}
    height={height} width={Math.round(height * 463 / 128)} alt="TypeLingo" draggable="false" />;
}
