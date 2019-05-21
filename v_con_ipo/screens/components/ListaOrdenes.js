import React from 'react';
import {
    View, ScrollView, ProgressBarAndroid,
    StyleSheet, AsyncStorage, RefreshControl
} from 'react-native';
import {
    ListItem
} from 'react-native-elements'

import { FileSystem } from 'expo';
import DataHandler from '../DataHandler';

const stsOrders = require('../../constantes/estadosOrden')
const colors = require('../../constantes/coloresEstados')

export default class ListaOrdenes extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            success: null,
            status: null,
            user: null,
            supervisor: null,
            data: [],
            isInProgress: false
        }
        this.loadOrders = this.loadOrders.bind(this);
        this.refreshDatabase = this.refreshDatabase.bind(this);
    }

    async componentDidMount() {
        this.loadOrders();
    }

    /**
     * Este método se crea para refrescar el estado de las órdenes según se guarde la información
     */
    async refresh() {
        if (!this.state.supervisor) {
            this.loadOrders();
        }
    }

    /**
     * Mediante este método se cargan las órdenes desde el archivo
     */
    async loadOrders() {
        this.setState({ isInProgress: true });
        let numDoc = await AsyncStorage.getItem('numDoc');
        var fileUri = FileSystem.documentDirectory + 'ingelectrica_data_' + numDoc + '.json';
        let res = await FileSystem.getInfoAsync(fileUri);
        if (res.exists) {
            let content = await FileSystem.readAsStringAsync(fileUri);
            var contentJson = JSON.parse(content);
            if (this.state.status == null) {
                this.setState(contentJson);
            } else {
                let newData = contentJson.data;
                this.setState({ data: newData });
            }
        } else {
            alert('No se encuentra el archivo de datos')
        }
        this.setState({ isInProgress: false });
    }

    /**
     * Con este método se envían y reciben los datos a la BD
     */

    refreshDatabase = async () => {
        this.setState({ isInProgress: true });
        //TODO enviar datos a BD
        var promise1 = Promise.resolve(DataHandler.refreshData());
        var that = this;
        promise1.then(function (value) {
            let valueJson = JSON.parse(value);
            if (valueJson.success) {
                that.props.navigation.navigate('PestanasPrincipal', DataHandler.traerCantidadPorEstados(valueJson));
            } else {
                alert(value);
            }
        });
        this.setState({ isInProgress: false });
    }

    render() {
        var llavesEstado = this.props.llaves;
        var listaOrdenes = new Array();
        this.state.data.forEach((orden) => {
            if (orden.orden_servicio != null
                && llavesEstado.includes(orden.orden_servicio.llave_estado)) {
                listaOrdenes.push(orden);
            }
        })
        return (
            <ScrollView refreshControl={
                <RefreshControl
                    onRefresh={this.refreshDatabase}
                />
            }>
                <View>
                    {this.state.isInProgress ? (
                        <ProgressBarAndroid color='#002A7C' />
                    ) : null}
                </View>
                <View>
                    {
                        listaOrdenes.map((l, i) => (
                            <ListItem
                                key={i}
                                title={`CD: ${l.orden_servicio.activo}\nGOM: ${l.orden_servicio.gom}\nDESCARGO: ${l.orden_servicio.descargo}${this.state.supervisor ? '\nCUADRILLLA: ' + l.nombre_cuadrilla : ''}`}
                                subtitle={`${l.orden_servicio.actividad}`}
                                badge={
                                    {
                                        value: stsOrders.valores_estados[l.orden_servicio.llave_estado],
                                        textStyle: {
                                            color: 'white',
                                            fontSize: 15,
                                            fontWeight: 'bold',
                                            backgroundColor: colors.colores_estados[l.orden_servicio.llave_estado],
                                        },
                                        containerStyle: { width: 100 }
                                    }
                                }
                                onPress={() => this.props.navigation.navigate('PestanasFormularios', { response: l, onGoBack: () => this.refresh() })}
                                style={styles.listItem}
                            />
                        ))
                    }
                </View>
            </ScrollView>
        );
    }
}
const styles = StyleSheet.create({
    listItem: {
        borderBottomWidth: 1,
        borderBottomColor: '#002A7C',
    }
});