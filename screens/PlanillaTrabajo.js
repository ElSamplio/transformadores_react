import React from 'react';
import {
    View, Text, KeyboardAvoidingView, Button, Alert,
    ScrollView, ProgressBarAndroid, AsyncStorage, Image,
    TouchableOpacity, StyleSheet, ToastAndroid
} from 'react-native';

import { Input } from 'react-native-elements';

import {
    Picker
} from 'native-base';

import { FileSystem, ImagePicker } from 'expo';
import Icon from 'react-native-vector-icons/FontAwesome';

const tags = require('../constantes/etiquetas');
const DataHandler = require('./DataHandler');
const file_name = require('../constantes/nombresArchivos');
const llv_st = require('../constantes/llavesEstadoOrden');

export default class PlanillaTrabajo extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            success: null,
            status: null,
            user: null,
            supervisor: null,
            data: [],
            isInProgress: false,
            currentDataIndex: null,
            pt_actual: {},
            nodos: [{
                activity_desc: '',
                cant: '',
                activity: '',
            }],
            valor_listados: [],
        }
        this.alimentarCampos = this.alimentarCampos.bind(this);
        this.generarDesplegable = this.generarDesplegable.bind(this);
        this.updateItems = this.updateItems.bind(this);
        this.save = this.save.bind(this);
    }

    async componentDidMount() {
        this.setState({ isInProgress: true });
        let numDoc = await AsyncStorage.getItem('numDoc');
        Promise.resolve(numDoc).then(async (doc) => {
            if (this.state.status == null) {
                var fileUri = FileSystem.documentDirectory + 'ingelectrica_data_' + doc + '.json';
                let res = await FileSystem.getInfoAsync(fileUri);
                if (res.exists) {
                    let content = await FileSystem.readAsStringAsync(fileUri);
                    var contentJson = JSON.parse(content);
                    this.setState(contentJson);
                } else {
                    alert('No se encuentra el archivo de datos')
                }
                const { navigation } = this.props;
                let response = navigation.getParam('response');
                var data = this.state.data;
                let idOrden = response.orden_servicio._id;
                data.forEach((value, index) => {
                    if (value != null && value.orden_servicio != null && value.orden_servicio._id == idOrden) {
                        this.setState({ currentDataIndex: index });
                    }
                });
                this.alimentarCampos(response);
            }
        }).catch((err) => {
            console.log('Error al traer el número de documento: ' + err)
        })
    }

    async alimentarCampos(response) {
        this.setState({ isInProgress: true });
        let idOrdenPt = response.planilla_trabajo.id_orden_servicio;
        let ordenServicio = response.orden_servicio;
        let cuadrilla = response.cuadrilla;
        let usr = JSON.parse(await AsyncStorage.getItem('user'));
        let valor_listados = DataHandler.traerValoresDeArchivo(file_name.archivos.valorListadosUri);
        var valorListadosJson = [];
        Promise.resolve(valor_listados).then((valor) => {
            valorListadosJson = JSON.parse(valor);
            this.setState({ valor_listados: valorListadosJson });
        });
        if (idOrdenPt != null) {
            let nodosPlanilla = response.planilla_trabajo.nodos;
            let nodosArr = nodosPlanilla;
            this.setState({ pt_actual: response.planilla_trabajo, nodos: nodosArr })
        } else {
            this.setState({
                pt_actual: {
                    id_cuadrilla: cuadrilla._id,
                    id_orden_servicio: ordenServicio.gom,
                    fecha_registro: new Date(),
                    placa_vehiculo: ordenServicio.placa,
                    elaborado_por: usr._id,
                    nombre_cuadrilla: cuadrilla.nombre,
                    cuadrilla_objeto: cuadrilla,
                    nodos: this.state.nodos,
                }
            })
        }
        this.setState({ isInProgress: false })
    }

    generarDesplegable(llaveListado, llavePadre, llavePadreNull, ignorarNoSelect) {
        let valores;
        if (llavePadre == null) {
            valores = DataHandler.traerValorListadosPorLlaveListado(this.state.valor_listados, llaveListado, llavePadreNull);
        } else {
            valores = DataHandler.traerValorListadosPorLlaveListadoYLlavePadre(this.state.valor_listados, llaveListado, llavePadre);
        }
        let items = valores.map((valor, i) => {
            return <Picker.Item key={i} label={`${valor.llave} - ${valor.valor}`} value={valor} />
        })
        let defaultItem = <Picker.Item key={-1} label={''} value={null} />
        items.unshift(defaultItem);
        return items;
    }

    /**
     * Mediante este método se actualiza el registro actual en el estado, puesto
     * que el estado contiene los datos de todos los registros del usuadio
     */
    async updateItems() {
        let index = this.state.currentDataIndex;
        var newItem = this.state.pt_actual;
        this.setState(state => {
            const data = state.data.map((item, j) => {
                if (j == index) {
                    item.planilla_trabajo = newItem;
                    return item;
                } else {
                    return item;
                }
            });
            return {
                data,
            };
        });
    }

    async save(cambioEstado) {
        let valido = true;
        this.state.nodos.map((nodo) => {
            if (nodo.activity == null || nodo.activity === ''
                || nodo.activity_desc == null || nodo.activity_desc === ''
                || nodo.cant == null || nodo.can === '') {
                valido = false;
                return;
            }
        })
        if (!valido) {
            ToastAndroid.show('Debe diligenciar todos los campos en los nodos', ToastAndroid.SHORT);
            return;
        }
        let planilla = { ...this.state.pt_actual };
        planilla.nodos = this.state.nodos;
        this.setState({ pt_actual: planilla });
        this.updateItems();
        let dataNewStatus = this.state.data;
        let newOrder;
        if (cambioEstado) {
            newOrder = DataHandler.updateOrderStatus(dataNewStatus[this.state.currentDataIndex], llv_st.llaves_estados.ST_OS_ENV_SPRV);
            dataNewStatus[this.state.currentDataIndex].orden_servicio = newOrder;
        }
        let objecToWrite = {
            success: this.state.success,
            status: this.state.status,
            user: this.state.user,
            supervisor: this.state.supervisor,
            data: this.state.data,
        }
        //TEST
        //var fileUri = FileSystem.documentDirectory + 'test.json';
        let numDoc = await AsyncStorage.getItem('numDoc');
        var fileUri = FileSystem.documentDirectory + 'ingelectrica_data_' + numDoc + '.json';
        await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(objecToWrite));
        /*let content = await FileSystem.readAsStringAsync(fileUri);
        var contentJson = JSON.parse(content);
        console.log('\n\nFILE CONTENT >>>>>>>>>>>>>>>>>\n\n' + JSON.stringify(contentJson) + '\n\n<<<<<<<<<<<<END FILE CONTENT');
        */
        if (!cambioEstado) {
            ToastAndroid.show('Cambios guardados', ToastAndroid.SHORT);
        } else {
            const { navigation } = this.props;
            navigation.navigate('PestanasPrincipal', { navigation: navigation, mensajeEstadoCambiado: true });
        }
    }

    render() {
        return (

            <ScrollView>
                <KeyboardAvoidingView behavior="padding">
                    {!this.state.supervisor ?
                        <View style={styles.saveButton}>
                            <TouchableOpacity title='test' onPress={() => { this.save() }}
                                disabled={this.state.isInProgress}>
                                <Icon name="save" size={30} color="#fff" />
                            </TouchableOpacity>
                        </View> :
                        <View />
                    }
                    <View>
                        {this.state.isInProgress ? (
                            <ProgressBarAndroid color='#002A7C' />
                        ) : null}
                    </View>
                    <View pointerEvents={this.state.supervisor ? 'none' : 'auto'}>
                        {this.state.nodos.map((nodo, i) => {
                            return <View key={i}>
                                <Text>{tags.etiquetas.pt_cant}</Text>
                                <Input value={'' + nodo.cant}
                                    keyboardType='phone-pad'
                                    onChangeText={(value) => {
                                        let nodos = this.state.nodos;
                                        let pt = { ...this.state.pt_actual };
                                        nodo.cant = value;
                                        nodos[i] = nodo;
                                        pt.nodos = nodos;
                                        this.setState({ pt_actual: pt });
                                    }
                                    } />
                                <Text>{tags.etiquetas.pt_descripcion_actividad}</Text>
                                <View style={{ flex: 1, flexDirection: 'row' }}>
                                    <View style={{ width: '90%' }}>
                                        <Text style={{ fontSize: 16 }}>{nodo.activity_desc}</Text>
                                    </View>
                                    <View style={{ width: 40 }}>
                                        <Picker onValueChange={(itemValue) => {
                                            if (itemValue != null) {
                                                //TODO: revisar, los arreglos al clonarlos se convierten en Object
                                                let nodos = this.state.pt_actual.nodos;
                                                let pt = { ...this.state.pt_actual };
                                                if (itemValue != null) {
                                                    nodo.activity_desc = itemValue.valor;
                                                    nodo.activity = itemValue.llave;
                                                } else {
                                                    nodo.activity_desc = null;
                                                    nodo.activity = null;
                                                }
                                                nodos[i] = nodo;
                                                pt.nodos = nodos;
                                                this.setState({ pt_actual: pt });
                                            }
                                        }
                                        }
                                        >
                                            {this.generarDesplegable('BAREMOS')}
                                        </Picker>
                                    </View>
                                </View>
                                <Text>{tags.etiquetas.pt_actividad}</Text>
                                <Text style={{ fontWeight: 'bold' }}>{nodo.activity}</Text>
                            </View>
                        })}
                    </View>
                    <View style={{ height: 10 }} />
                    {!this.state.supervisor ?
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'stretch' }}>
                            <Button title={tags.etiquetas.pt_agregar_nodo}
                                onPress={() => {
                                    let nodo = this.state.nodos[this.state.nodos.length - 1]
                                    if (nodo.cant == null || nodo.activity_desc == null) {
                                        ToastAndroid.show(tags.etiquetas.pt_error_agregar_nodo, ToastAndroid.SHORT)
                                    } else {
                                        let newNode = {
                                            activity_desc: '',
                                            cant: '',
                                            activity: '',
                                        }
                                        this.state.nodos.push(newNode);
                                        this.updateItems();
                                    }
                                }} />
                            <View style={{ width: 50 }} />
                            <Button title={tags.etiquetas.pt_eliminar_nodo}
                                disabled={this.state.nodos.length < 2}
                                onPress={() => {
                                    this.state.nodos.pop();
                                    this.updateItems();
                                }} />
                        </View> :
                        <View />
                    }

                    <Text>{tags.etiquetas.rg_observaciones}</Text>
                    <Input value={this.state.pt_actual.observaciones}
                        multiline={true}
                        numberOfLines={3}
                        onChangeText={(value) => {
                            let pt = { ...this.state.pt_actual };
                            pt.observaciones = value;
                            this.setState({ pt_actual: pt });
                        }
                        } />
                    <View style={{ height: 10 }} />
                    {!this.state.supervisor ?
                        <View>
                            <Button title='Guardar' onPress={() => {
                                this.save(true);
                            }} />
                            <View style={{ height: 100 }} />
                        </View> :
                        <View></View>
                    }
                </KeyboardAvoidingView>
            </ScrollView>
        );
    }
}
const styles = StyleSheet.create({
    saveButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        paddingTop: 5,
        paddingBottom: 5,
        paddingLeft: 5,
        paddingRight: 5,
        backgroundColor: '#007FFF',
        borderRadius: 10,
        zIndex: 100,
    },
})