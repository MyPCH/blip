import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { components as vizComponents } from '@tidepool/viz';
import { useDispatch } from 'react-redux';

const { Loader } = vizComponents;

export const Gate = (props) => {
  const { onEnter, children } = props;
  const [ hasRun, setRun ] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(onEnter((run = true) => setRun(run)));
  }, []);

  return hasRun ? <>{children}</> : <Loader />;
};

Gate.propTypes = {
  onEnter: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

export default Gate;
