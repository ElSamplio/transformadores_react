import React from 'react';
import ListaOrdenes from './ListaOrdenes';
const llv_st_ejc = require('../../constantes/llavesEstadoOrden');

export default class EnEjecucion extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isSupervisor: false,
    }
  }

  render() {
    let llavesSt = [llv_st_ejc.llaves_estados.ST_OS_EJEC_IPO, llv_st_ejc.llaves_estados.ST_OS_EJEC_RG,llv_st_ejc.llaves_estados.ST_OS_EJEC_PT];
    const navigation = this.props.navigation;
    return (
      <ListaOrdenes llaves={llavesSt} navigation={navigation}/>
    );
  }
}