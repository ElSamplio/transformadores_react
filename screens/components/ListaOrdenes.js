import React from 'react';
import {
    View, ScrollView, ProgressBarAndroid,
    StyleSheet, AsyncStorage, RefreshControl,
    ToastAndroid,
} from 'react-native';
import {
    ListItem
} from 'react-native-elements'

import { FileSystem } from 'expo';
import DataHandler from '../DataHandler';

const stsOrders = require('../../constantes/estadosOrden')
const colors = require('../../constantes/coloresEstados')
const tagsLista = require('../../constantes/etiquetas')

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
            this.props.navigation.navigate('PestanasPrincipal', { navigation: this.props.navigation, estadoCambiado: false });
            //this.loadOrders();
        }
    }

    /**
     * Mediante este método se cargan las órdenes desde el archivo
     */
    async loadOrders() {
        this.setState({ isInProgress: true });
        let filters = this.props.navigation.getParam('filtros');
        let numDoc = await AsyncStorage.getItem('numDoc');
        var fileUri = FileSystem.documentDirectory + 'ingelectrica_data_' + numDoc + '.json';
        let res = await FileSystem.getInfoAsync(fileUri);
        if (res.exists) {
            let content = await FileSystem.readAsStringAsync(fileUri);
            var contentJson = JSON.parse(content);
            if (this.state.status == null) {
                if (filters != null) {
                    let data = contentJson.data;
                    let filteredData = [];
                    let size = 0;
                    for (let key of Object.keys(filters)) {
                        size++;
                    }
                    if (size > 0) {
                        for (let key of Object.keys(filters)) {
                            if (key != 'cuadrilla'
                                && key != 'fecha_registro') {
                                filteredData = data.filter(valor => valor.orden_servicio[key].includes(filters[key]));
                            } else if (key == 'cuadrilla') {
                                filteredData = data.filter(valor => valor.cuadrilla._id == filters[key]);
                            } /*else if (key == 'fecha_registro') {
                                fechaFiltro = filters[key];
                                fechaFiltro.setHours(0, 0, 0, 0);
                                console.log('fechaFiltro>> ' + fechaFiltro);
                                data.forEach((dato) => {
                                    fechaDato = dato.orden_servicio.fecha_registro;                                    
                                    console.log('fechaDato.getMonth()'+fechaDato.getMonth()+'fechaDato.getHours();>> ' + fechaDato.getHours()+'fechaDato.getMinutes()'+fechaDato.getMinutes());
                                })
                            }*/
                            data = filteredData;
                        }
                        contentJson.data = filteredData;
                        this.setState(contentJson);
                    } else {
                        this.setState(contentJson);
                    }
                } else {
                    this.setState(contentJson);
                }
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
        let dataSent = DataHandler.sendData();
        var that = this;
        Promise.resolve(dataSent).then((data) => {
            let resSendData = data;
            if (resSendData.ok) {
                let filesSent = DataHandler.sendPictures();
                var promise1 = Promise.resolve(DataHandler.refreshData());
                promise1.then(async function (value) {
                    let valueJson = JSON.parse(value);
                    if (valueJson.success) {
                        DataHandler.writeDataToMainFile(valueJson);
                        ToastAndroid.show(tagsLista.etiquetas.sinc_datos_ok, ToastAndroid.LONG);
                        that.props.navigation.navigate('PestanasPrincipal', { navigation: that.props.navigation, estadoCambiado: false });
                        this.setState({ isInProgress: false });
                    } else {
                        this.setState({ isInProgress: false });
                        ToastAndroid.show(tagsLista.etiquetas.sinc_datos_err + '> success:false evaluando refreshData()', ToastAndroid.SHORT);
                    }
                }).catch((err) => {
                    this.setState({ isInProgress: false });
                });
                Promise.resolve(filesSent).then((files) => {
                    ToastAndroid.show('Cargando archivos en segundo plano', ToastAndroid.SHORT);
                }).catch((err) => {
                    ToastAndroid.show(tagsLista.etiquetas.sinc_datos_err + err, ToastAndroid.SHORT);
                    this.setState({ isInProgress: false });
                })
            } else {
                ToastAndroid.show(tagsLista.etiquetas.sinc_datos_err, ToastAndroid.SHORT);
                this.setState({ isInProgress: false });
            }
        }).catch((err) => {
            console.log(err);
            ToastAndroid.show(tagsLista.etiquetas.sinc_error_ejec, ToastAndroid.LONG);
            this.setState({ isInProgress: false });
        })
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
                    refreshing={this.state.isInProgress}
                    onRefresh={this.refreshDatabase}
                />
            }>
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