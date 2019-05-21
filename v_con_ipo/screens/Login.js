import React from 'react';
import {
    View, KeyboardAvoidingView, StyleSheet, Image,
    NavigationEvents, ProgressBarAndroid, NetInfo,
    AsyncStorage, ToastAndroid
} from 'react-native';

import {
    Button, Input
} from 'react-native-elements';

import Dialog from './Dialog.js';
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
            header: null
        };
    };

    constructor(props) {
        super(props);
        this.state = {
            loginData: {
                numero_documento: '',
                contrasena: '',
            },
            alertVisible: false,
            alertMessage: '-Default-',
            isInProgress: false,
        };
        this.secureLogin = this.secureLogin.bind(this);
        this.onPressDialogButton = this.onPressDialogButton.bind(this);
        this.deleteFile = this.deleteFile.bind(this);
    }

    async componentDidMount() {
        this.setState({ isInProgress: true })
        let numDoc = await AsyncStorage.getItem('numDoc');
        let pw = await AsyncStorage.getItem('contrasena');
        let usr = await AsyncStorage.getItem('user');
        if (numDoc != null && pw != null) {
            let loginDataNew = { ...this.state.loginData };
            loginDataNew.numero_documento = numDoc;
            loginDataNew.contrasena = pw;
            this.setState({ loginData: loginDataNew });
            this.secureLogin();
        }
        //cargar valores "estáticos" a archivos
        //TODO Boton de recarga
        DataHandler.cargarValoresAArchivo(file_names.archivos.valorListadosUri, services.find_valor_listados);
        DataHandler.cargarValoresAArchivo(file_names.archivos.grupoRiesgoUri, services.find_grupo_riesgos);
        DataHandler.cargarValoresAArchivo(file_names.archivos.riesgoSeguridadUri, services.find_riesgo_seguridad);
        this.setState({ isInProgress: false })
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
                        return { alertMessage: 'No existe conexión estable ni archivo de datos para el usuario, por lo cual no es posible cargar datos', alertVisible: true, isInProgress: false };
                    } else {
                        let request = services.service_url + services.secure_login + '/' + estado.numero_documento + '/' + estado.contrasena;
                        let response = await fetch(request);
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
                    navigate('PestanasPrincipal', { isSupervisor: isSupervisor, pendientes: contPendientes, enEjec: contEnEjecucion, ejecutadas: contEjecutadas });
                } else {
                    return { alertMessage: JSON.stringify(responseJson), alertVisible: true, isInProgress: false };
                }
            }).then((response) => {
                if (response == null) {
                    this.setState({ isInProgress: false });
                } else {
                    this.setState(response);
                }
            });
        } catch (error) {
            console.log('****************************ERRRORRRRRR*********************')
            console.error(error);
            alert(error);
            this.setState({ isInProgress: false });
        }
        this.setState({ isInProgress: false });
    }

    onPressDialogButton() {
        this.setState({ alertVisible: false, isInProgress: false });
    }

    render() {
        return (
            <KeyboardAvoidingView behavior="padding" style={styles.content}>
                <Image source={require(logoUrl)}
                    style={styles.image}
                    resizeMode='contain' />
                <Dialog alertVisible={this.state.alertVisible}
                    alertMessage={this.state.alertMessage}
                    navigation={this.props.navigation}
                    buttonAction={this.onPressDialogButton} />
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