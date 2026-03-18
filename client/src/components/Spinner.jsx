import React from 'react';

export function Spinner({ size = 28 }) {
  return (
    <div className="spinner" style={{ width: size, height: size }} />
  );
}

export function SpinnerWrap() {
  return (
    <div className="spinner-wrap">
      <Spinner />
    </div>
  );
}
