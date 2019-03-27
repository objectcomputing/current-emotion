import {number, string} from 'prop-types';
import React from 'react';
import './bar.scss';

const Bar = ({label, percent}) => (
  <div className="bar">
    <div className="value" style={{width: percent + '%'}} />
    <div className="label">{label}</div>
  </div>
);

Bar.propTypes = {
  label: string,
  percent: number.isRequired
};

Bar.defaultProps = {
  label: ''
};

export default Bar;
