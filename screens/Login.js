import React from 'react';
import {
    View, KeyboardAvoidingView, StyleSheet, Image,
    TouchableOpacity, ProgressBarAndroid, NetInfo,
    AsyncStorage, ToastAndroid, Alert
} from 'react-native';

import {
    Button, Input
} from 'react-native-elements';

import Icon from 'react-native-vector-icons/FontAwesome';
import { FileSystem } from 'expo';
import DataHandler from './DataHandler';

const logoUrl = '../assets/logo_ing.png'
const tags = require('../constantes/etiquetas.js');
const services = require('../constantes/servicios.js');
const llv_st = require('../constantes/llavesEstadoOrden');
const file_names = require('../constantes/nombresArchivos');

export default class Login extends React.Component {

    static navigationOptions = ({ navigation }) => {
        return {
            title: tags.etiquetas.titulo_barra,
            headerLeft:
                <TouchableOpacity style={{ paddingLeft: 10 }} onPress={async () => {
                    navigation.setParams({ color: '#AAAAAA' });
                    if (navigation.getParam('color') == '#AAAAAA') {
                        Alert.alert(
                            tags.etiquetas.titulo_actualizar_listados,
                            tags.etiquetas.mensaje_actualizar_listados,
                            [
                                {
                                    text: tags.etiquetas.btn_aceptar,
                                    onPress: async () => {
                                        ToastAndroid.show(tags.etiquetas.mensaje_actualizando, ToastAndroid.LONG);
                                        Promise.resolve(DataHandler.validarConexion()).then((isConnected) => {
                                            if (isConnected) {
                                                let cuadrillas = DataHandler.cargarValoresAArchivo(file_names.archivos.cuadrillasUri, services.find_cuadrillas, true);
                                                let valor_listados = DataHandler.cargarValoresAArchivo(file_names.archivos.valorListadosUri, services.find_valor_listados, true);
                                                Promise.all([cuadrillas, valor_listados]).then(() => {
                                                    ToastAndroid.show(tags.etiquetas.mensaje_datos_actualizados, ToastAndroid.SHORT);
                                                });
                                            } else {
                                                ToastAndroid.show(tags.etiquetas.no_connection, ToastAndroid.SHORT);
                                            }
                                        })
                                    }
                                },
                                {
                                    text: tags.etiquetas.btn_cancelar,
                                    onPress: async () => { }
                                },

                            ],
                            { cancelable: false },
                        );
                    }
                }}>
                    <Icon name="refresh" size={20} color={navigation.getParam('color', '#fff')} />
                </TouchableOpacity>,
            headerRight:
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity style={{ paddingRight: 10 }} onPress={async () => {
                        navigation.setParams({ color: '#AAAAAA' });
                        if (navigation.getParam('color') == '#AAAAAA') {
                            Alert.alert(
                                tags.etiquetas.titulo_eliminar_datos,
                                tags.etiquetas.mensaje_eliminar_datos,
                                [
                                    {
                                        text: tags.etiquetas.btn_aceptar,
                                        onPress: async () => {
                                            ToastAndroid.show(tags.etiquetas.mensaje_eliminando, ToastAndroid.LONG);
                                            let resp = FileSystem.readDirectoryAsync(FileSystem.documentDirectory)
                                            Promise.resolve(resp).then(async (dirContent) => {
                                                await dirContent.forEach(async (file) => {
                                                    let fileUri = FileSystem.documentDirectory + file;
                                                    await FileSystem.deleteAsync(fileUri);
                                                })
                                                ToastAndroid.show(tags.etiquetas.mensaje_datos_eliminados, ToastAndroid.SHORT);
                                            })
                                        }
                                    },
                                    {
                                        text: tags.etiquetas.btn_cancelar,
                                        onPress: () => { },
                                        style: 'cancel',
                                    },

                                ],
                                { cancelable: false },
                            );
                        }
                    }}>
                        <Icon name='trash' size={20} color={navigation.getParam('color', '#fff')} />
                    </TouchableOpacity>
                    <TouchableOpacity style={{ paddingRight: 10 }} onPress={async () => {
                        navigation.setParams({ color: '#fff' });
                    }}>
                        <Icon name='eye-slash' size={20} color={navigation.getParam('color', '#fff')} />
                    </TouchableOpacity>
                </View>,
            headerStyle: {
                height: 30,
            },
            headerTintColor: navigation.getParam('color', '#fff'),
            headerTitleStyle: {
                fontSize: 15
            },
        }
    };

    constructor(props) {
        super(props);
        this.state = {
            loginData: {
                numero_documento: '',
                contrasena: '',
            },
            isInProgress: false,
        };
        this.secureLogin = this.secureLogin.bind(this);
        this.deleteFile = this.deleteFile.bind(this);
    }

    async componentDidMount() {
        this.setState({ isInProgress: true })
        let numDoc = await AsyncStorage.getItem('numDoc');
        let pw = await AsyncStorage.getItem('contrasena');
        let usr = await AsyncStorage.getItem('user');
        //cargar valores "estáticos" a archivos
        let valorListados = DataHandler.cargarValoresAArchivo(file_names.archivos.valorListadosUri, services.find_valor_listados, false);
        let cuadrillas = DataHandler.cargarValoresAArchivo(file_names.archivos.cuadrillasUri, services.find_cuadrillas, false);
        Promise.all([numDoc, pw, usr, valorListados, cuadrillas]).then((values) => {
            let n = values[0];
            let p = values[1];
            let u = values[2];
            if (n != null && p != null) {
                let loginDataNew = { ...this.state.loginData };
                loginDataNew.numero_documento = numDoc;
                loginDataNew.contrasena = pw;
                this.setState({ loginData: loginDataNew });
                this.secureLogin();
            } else {
                this.setState({ isInProgress: false });
            }
        }).catch((err) => {
            this.setState({ isInProgress: false });
        })
        //Validar la eliminación de esto, que es para el IPO (que ya no existe :'( )
        //DataHandler.cargarValoresAArchivo(file_names.archivos.grupoRiesgoUri, services.find_grupo_riesgos, false);
        //DataHandler.cargarValoresAArchivo(file_names.archivos.riesgoSeguridadUri, services.find_riesgo_seguridad, false);
        //this.setState({ isInProgress: false })
    }

    async deleteFile() {
        var estado = this.state.loginData;
        var fileUri = FileSystem.documentDirectory + 'ingelectrica_data_' + estado.numero_documento + '.json';
        FileSystem.deleteAsync(fileUri);
        ToastAndroid.show('Se eliminó el archivo' + fileUri, ToastAndroid.SHORT);
    }

    async secureLogin() {
        var estado = this.state.loginData;
        const { navigate } = this.props.navigation;
        try {
            NetInfo.getConnectionInfo().then(async function (connection) {
                if (estado.numero_documento == null || estado.numero_documento == '') {
                    ToastAndroid.show('El número de documento es requerido', ToastAndroid.SHORT);
                    return { isInProgress: false };
                } else {
                    var reg = /^\d+$/;
                    if (!reg.test(estado.numero_documento)) {
                        ToastAndroid.show('El número de documento debe contener sólo números', ToastAndroid.SHORT);
                        return { isInProgress: false };
                    }
                }
                if (estado.contrasena == null || estado.contrasena == '') {
                    ToastAndroid.show('La contraseña es requerida', ToastAndroid.SHORT);
                    return { isInProgress: false };
                }
                let responseJson = null;
                let connected = connection.type != 'none'
                let goodConnection = (connection.type == 'wifi') || (connection.type == 'cellular' && (connection.effectiveType == '3g' || connection.effectiveType == '4g'));
                var fileUri = FileSystem.documentDirectory + 'ingelectrica_data_' + estado.numero_documento + '.json';
                let res = await FileSystem.getInfoAsync(fileUri);
                if (res.exists) {
                    let content = await FileSystem.readAsStringAsync(fileUri);
                    try {
                        responseJson = JSON.parse(content);
                    } catch (error) {
                        console.log('*********************ERROR************************\n\n' + fileUri);
                        FileSystem.deleteAsync(fileUri);
                    }
                } else {
                    if (!connected || !goodConnection) {
                        ToastAndroid.show('No existe conexión estable ni archivo de datos para el usuario, por lo cual no es posible cargar datos', ToastAndroid.SHORT);
                        this.setState({ isInProgress: false });
                    } else {
                        let request = services.service_url + services.secure_login + '/' + estado.numero_documento + '/' + estado.contrasena;
                        let response = await fetch(request).catch((err) => {
                            console.log('Error al llamar el servicio ' + request)
                            ToastAndroid.show('Error al conectarse al servidor, por favor revise su conexión y si es efectiva, reporte al departamento técnico', ToastAndroid.SHORT);
                            console.log(err);
                            this.setState({ isInProgress: false });
                        });
                        let singleResponse = response._bodyText;
                        responseJson = JSON.parse(singleResponse);
                    }
                }
                let contPendientes = 0;
                let contEnEjecucion = 0;
                let contEjecutadas = 0;
                let llavesStPendientes = [llv_st.llaves_estados.ST_OS_ASGN];
                let llavesStEnEjecucion = [llv_st.llaves_estados.ST_OS_EJEC_IPO, llv_st.llaves_estados.ST_OS_EJEC_RG, llv_st.llaves_estados.ST_OS_EJEC_PT];
                let llavesStParaEnviar = [llv_st.llaves_estados.ST_OS_ENV_SPRV]
                if (responseJson.success) {
                    let isSupervisor = responseJson.supervisor;
                    responseJson.data.forEach((orden) => {
                        if (orden.orden_servicio != null && !isSupervisor) {
                            if (llavesStPendientes.includes(orden.orden_servicio.llave_estado)) {
                                contPendientes++;
                            }
                            if (llavesStEnEjecucion.includes(orden.orden_servicio.llave_estado)) {
                                contEnEjecucion++;
                            }
                            if (llavesStParaEnviar.includes(orden.orden_servicio.llave_estado)) {
                                contEjecutadas++;
                            }
                        } else {
                            contPendientes++;
                        }
                    })
                    var fileUri = FileSystem.documentDirectory + 'ingelectrica_data_' + estado.numero_documento + '.json';
                    var contents = JSON.stringify(responseJson);
                    await FileSystem.writeAsStringAsync(fileUri, contents);
                    await AsyncStorage.setItem('isSupervisor', isSupervisor.toString());
                    await AsyncStorage.setItem('pendientes', '' + contPendientes);
                    await AsyncStorage.setItem('enEjec', '' + contEnEjecucion);
                    await AsyncStorage.setItem('numDoc', estado.numero_documento);
                    await AsyncStorage.setItem('contrasena', estado.contrasena);
                    await AsyncStorage.setItem('user', JSON.stringify(responseJson.user));
                    navigate(isSupervisor ? 'Consulta' : 'PestanasPrincipal', { isSupervisor: isSupervisor, pendientes: contPendientes, enEjec: contEnEjecucion, ejecutadas: contEjecutadas });
                } else {
                    ToastAndroid.show(responseJson.message, ToastAndroid.SHORT);
                }
            }).then((response) => {
                if (response == null) {
                    this.setState({ isInProgress: false });
                } else {
                    this.setState(response);
                }
            }).catch((error) => {
                this.setState({ isInProgress: false });
            });
        } catch (error) {
            console.log('****************************ERRRORRRRRR*********************')
            console.error(error);
            alert(error);
            this.setState({ isInProgress: false });
        }
    }

    render() {
        return (
            <KeyboardAvoidingView style={styles.content} behavior="padding">
                <Image source={require(logoUrl)}
                    style={styles.image}
                    resizeMode='contain' />
                <View style={styles.inputsContainer}>
                    <View style={{ height: 80 }} />
                    <Input placeholder={tags.etiquetas.numero_documento}
                        editable={!this.state.isInProgress}
                        keyboardType='phone-pad'
                        onChangeText={(text) => {
                            const loginData = Object.assign({}, this.state.loginData, { numero_documento: text });
                            this.setState({ loginData });
                        }
                        }
                    />
                    <View style={{ height: 10 }} />
                    <Input placeholder={tags.etiquetas.contrasena}
                        editable={!this.state.isInProgress}
                        secureTextEntry={true}
                        onChangeText={(text) => {
                            const loginData = Object.assign({}, this.state.loginData, { contrasena: text });
                            this.setState({ loginData });
                        }
                        }
                    />
                    <View style={{ height: 20 }} />
                    <Button title={tags.etiquetas.login}
                        onPress={() => { this.secureLogin(); this.setState({ isInProgress: true }) }}
                        disabled={this.state.isInProgress} />
                    <View>
                        {this.state.isInProgress ? (
                            <ProgressBarAndroid color='#002A7C' />
                        ) : null}
                    </View>
                </View>
            </KeyboardAvoidingView>
            /* TODO, PONER UN CATCH ANTE UN ERROR Y DADO CASO, QUE SE MUESTR UN BOTÓN
            PARA QUE ELIMINE EL ARCHIVO
            <Button title={'Eliminar datos guardados'}
                        onPress={() => {this.deleteFile()}}
                        disabled={this.state.isInProgress} />
            */
        );
    }
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputsContainer: {
        width: '80%'
    },
    image: {
        height: 80,
    },
});