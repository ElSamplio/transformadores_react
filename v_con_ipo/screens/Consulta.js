import React from 'react'
import {
    Text, View, Button
} from 'react-native'
export default class Consulta extends React.Component {

    static navigationOptions = {
        title: 'Filtro de órdenes',
        headerLeft: <View></View>,
        headerRight: <View></View>
    };

    render() {
        const { navigate } = this.props.navigation;
        return (
            <View>
                <Button title='IPO' onPress={() => { navigate('Rg') }} />
                <Text>Interfaz de consulta (coming soon)</Text>
            </View>
        )
    }

}