import React from 'react';
import {
  createMaterialTopTabNavigator,
  createAppContainer
} from 'react-navigation';
import {
  TouchableOpacity, StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Ipo from './Ipo';
import Rg from './Rg';
import PlanillaTrabajo from './PlanillaTrabajo';

class PestanasFormularios extends React.Component {

  static navigationOptions = ({ navigation }) => {
    let response = navigation.getParam('response');
    return {
      title: 'GOM # ' + response.orden_servicio.gom,
      headerLeft:
        <TouchableOpacity style={styles.buttons} onPress={() => { navigation.state.params.onGoBack(); navigation.goBack() }}>
          <Icon name="chevron-left" size={20} color="#fff" />
        </TouchableOpacity>,
      headerRight:
        <TouchableOpacity style={styles.buttons} />,
    };
  };

  constructor(props) {
    super(props);
    this.state = {
      isSupervisor: false,
    }
  }

  render() {
    const { navigation } = this.props;
    let response = navigation.getParam('response');
    let ipoExists = response.ipo.id_orden_servicio != null;
    let rgExists = response.rg.id_orden_servicio != null;
    let ptExists = response.planilla_trabajo.id_orden_servicio != null;
    const TabNavigator = createMaterialTopTabNavigator({
      Ipo: {
        screen: () => <Ipo response={response} navigation={this.props.navigation} />,
        navigationOptions: {
          title: 'IPO',
        }
      },
      ...(rgExists ? {
        Rg: {
          screen: () => <Rg response={response} navigation={this.props.navigation} />,
          navigationOptions: {
            title: 'RG',
          }
        },
      } : {}),
      ...(ptExists ? {
        PlanillaTrabajo: {
          screen: () => <PlanillaTrabajo response={response} navigation={this.props.navigation} />,
          navigationOptions: {
            title: 'Planilla de trabajo',
          }
        },
      } : {})
    },
      {
        tabBarOptions: {
          labelStyle: {
            fontSize: 12,
          },
          style: {
            backgroundColor: '#002A7C',
            height: 45,
          },
          indicatorStyle: {
            backgroundColor: '#007FFF',
          },
          scrollEnabled: true,
        },
        backBehavior: 'order',
      })
    const FormsTabNavigator = createAppContainer(TabNavigator)
    return <FormsTabNavigator />
  }
}

const styles = StyleSheet.create({
  buttons: {
    width: 40,
    alignItems: 'center',
  }
})

export default PestanasFormularios