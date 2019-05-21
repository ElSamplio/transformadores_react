import React from 'react';
import {Overlay, Text, Button} from 'react-native-elements';
import {View, StyleSheet} from 'react-native';

export default class Dialog extends React.Component{

    constructor(props){
        super(props);
    }

    render(){
        return (
            <Overlay transparent={false}
                isVisible={this.props.alertVisible}
                height={200}
                onRequestClose={() => this.props.navigation.navigate('ListaOrdenes')}>
                <View style={styles.modal}>
                    <View style={styles.modaltitle}>
                        <Text style={styles.titulolabel}>Información</Text>
                    </View>
                    <View>
                        <Text>{this.props.alertMessage}</Text>
                    </View>
                    <View>
                        <Button title='Aceptar'
                            onPress={this.props.buttonAction}/>
                    </View>
                </View>
            </Overlay>
        );
    }

}

const styles = StyleSheet.create({
    modal: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    modaltitle: {
        height: 50, 
        backgroundColor: '#002a7c',
        justifyContent: 'center',
        alignItems: 'center',
    },
    titulolabel: {
        fontWeight: 'bold',
        fontSize: 20,
        color: 'white',
    },
});