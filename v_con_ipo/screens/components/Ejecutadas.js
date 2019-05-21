import React from 'react';
import ListaOrdenes from './ListaOrdenes';
const llv_st_ejcd = require('../../constantes/llavesEstadoOrden');

export default class Ejecutadas extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isSupervisor: false,
    }
  }

  render() {
    let llavesSt = [llv_st_ejcd.llaves_estados.ST_OS_ENV_SPRV];
    const navigation = this.props.navigation;
    return (
      <ListaOrdenes llaves={llavesSt} navigation={navigation}/>
    );
  }
}