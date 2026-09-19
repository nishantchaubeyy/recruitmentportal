import React from 'react';

/**
 * Standardized DYPIU Background Watermark Component.
 * Renders a subtle, non-overlapping black-and-white DYPIU logo watermark (/logobw1.png)
 * in the right side margin of pages.
 */
function DYPIUWatermark({ top = '160px', right = '25px', width = '280px', opacity = 0.22 }) {
  return (
    <img
      src="/logobw1.png"
      alt=""
      className="dypiu-page-watermark-img"
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: top,
        right: right,
        width: width,
        height: 'auto',
        opacity: opacity,
        filter: 'brightness(0.6) contrast(1.4)',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        outline: 'none',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 0
      }}
    />
  );
}

export default DYPIUWatermark;
