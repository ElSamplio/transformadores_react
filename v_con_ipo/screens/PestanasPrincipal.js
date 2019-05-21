import React from 'react';
import { createMaterialTopTabNavigator, createAppContainer } from 'react-navigation';
import { AsyncStorage } from 'react-native';
import Pendientes from './components/Pendientes';
import EnEjecucion from './components/EnEjecucion';
import Ejecutadas from './components/Ejecutadas';

class PestanasPrincipal extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isSupervisor: false,
    }
  }

  render() {
    const { navigation } = this.props;
    let isSupervisor = navigation.getParam('isSupervisor');
    let pendientes = navigation.getParam('pendientes');
    let enEjec = navigation.getParam('enEjec');
    let ejecutadas = navigation.getParam('ejecutadas');
    const TabNavigator = createMaterialTopTabNavigator({
      Pendientes: {
        screen: () => <Pendientes navigation={this.props.navigation} />,
        navigationOptions: {
          //title: isSupervisor ? 'POR REVISAR (' + pendientes + ')' : 'PENDIENTES (' + pendientes + ')',
          title: isSupervisor ? 'POR REVISAR' : 'PENDIENTES',
        }
      },
      ...(!isSupervisor ? {
        EnEjecucion: {
          screen: () => <EnEjecucion navigation={this.props.navigation} />,
          navigationOptions: {
            //title: 'EN EJECUCIÓN (' + enEjec + ')',
            title: 'EN EJECUCIÓN',
          }
        },
        Ejecutadas: {
          screen: () => <Ejecutadas navigation={this.props.navigation} />,
          navigationOptions: {
            //title: 'EJECUTADAS (' + ejecutadas + ')',
            title: 'EJECUTADAS',
          }
        }
      } : {})
    },
      {
        tabBarOptions: {
          labelStyle: {
            fontSize: 12,
          },
          style: {
            backgroundColor: '#002A7C',
            height:45,
          },
          indicatorStyle: {
            backgroundColor: '#007FFF',
          },
          scrollEnabled: true,
        },
        backBehavior: 'history',
        lazy: true,
      })
    const ContainedTabNavigator = createAppContainer(TabNavigator)
    return <ContainedTabNavigator />
  }
}

export default PestanasPrincipal