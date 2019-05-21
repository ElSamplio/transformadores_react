import React from 'react';

import {
  createStackNavigator, createAppContainer,
} from "react-navigation";
import {
  TouchableOpacity, StyleSheet, AsyncStorage, View, NavigationEvents
} from 'react-native';

import Icon from 'react-native-vector-icons/FontAwesome';


import Login from './screens/Login';
import PestanasPrincipal from './screens/PestanasPrincipal'
import PestanasFormularios from './screens/PestanasFormularios'
import Consulta from './screens/Consulta'

const AppNavigator = createStackNavigator({
  Login: {
    screen: Login,
  },
  PestanasPrincipal: {
    screen: PestanasPrincipal
  },
  PestanasFormularios: {
    screen: PestanasFormularios
  },
  Consulta: {
    screen: Consulta
  },
},
  {
    initialRouteName: 'Login',
    defaultNavigationOptions: ({ navigation }) => ({
      title: 'Órdenes de servicio',
      headerLeft:
        <TouchableOpacity style={styles.buttons} onPress={() => { navigation.navigate('Consulta', { isSupervisor: navigation.getParam('isSupervisor') }) }}>
          <Icon name="filter" size={20} color="#fff" />
        </TouchableOpacity>,
      headerRight:
        <TouchableOpacity style={styles.buttons} onPress={async () => {
          await AsyncStorage.removeItem('contrasena').then(async () => {
            await AsyncStorage.removeItem('numDoc').then(async () => {
              await AsyncStorage.removeItem('user').then(() => {
                navigation.navigate('Login');
              })
            })
          })
        }}>
          <Icon name="sign-out" size={20} color="#fff" />
        </TouchableOpacity>,
      headerStyle: {
        backgroundColor: '#002A7C',
        height: 45,
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontSize: 18
      },
    })
  });

const AppContainer = createAppContainer(AppNavigator);

const styles = StyleSheet.create({
  buttons: {
    width: 40,
    alignItems: 'center',
  },
  toolbar: {
    backgroundColor: '#db4b3f',
    height: 56
  },
})

export default class App extends React.Component {
  render() {
    return <AppContainer />;
  }
}