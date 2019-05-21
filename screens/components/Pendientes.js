import React from 'react';
import ListaOrdenes from './ListaOrdenes';
import { AsyncStorage, View, Button } from "react-native"
const llv_st = require('../../constantes/llavesEstadoOrden');

export default class Pendientes extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = {
      isSupervisor: false,
    }
  }

  async componentDidMount() {
    this.setState({ isSupervisor: await AsyncStorage.getItem('isSupervisor') == 'true' })
  }

  render() {
    let llavesSt;
    const navigation = this.props.navigation;
    if (this.state.isSupervisor) {
      llavesSt = [llv_st.llaves_estados.ST_OS_POR_RVS];
    } else {
      llavesSt = [llv_st.llaves_estados.ST_OS_ASGN];
    }
    return (
      <View>
        <ListaOrdenes llaves={llavesSt} navigation={navigation} />
      </View>

    );
  }
}