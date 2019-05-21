import { FileSystem } from 'expo';
import { AsyncStorage, NetInfo } from "react-native"
import { ToastAndroid } from 'react-native';
const services = require('../constantes/servicios.js');
const llv_st = require('../constantes/llavesEstadoOrden');
const file_name = require('../constantes/nombresArchivos');
const tags = require('../constantes/etiquetas');

/**
 * Se crea este archivo js con el fin de manejar toda la parte de datos mediante funciones
 * que son comunes en los diferentes módulos de la APK
 */

var DataHandler = {

    /**
     * Retorna el estado de la conexión del equipo con el fin de validar conectividad previamente
     * a realizar operaciones de cargue y descargue de información
     */
    getConnectionStatus: function () {
        var isConnectionAvailable = NetInfo.getConnectionInfo().then(async (connection) => {
            let connected = connection.type != 'none'
            let goodConnection = (connection.type == 'wifi') || (connection.type == 'cellular' && (connection.effectiveType == '3g' || connection.effectiveType == '4g'));
            return connected && goodConnection;
        });
        return isConnectionAvailable;
    },

    /**
     * Este método trae los datos desde la base de datos consumiendo el respectivo servicio, 
     * se emplea para escribir los datos en el archivo y así actualizar la información en la APK
     */
    refreshData: function () {
        var isConnectionAvailable = this.getConnectionStatus();
        return Promise.resolve(isConnectionAvailable).then(async (isConnected) => {
            let numDoc = await AsyncStorage.getItem('numDoc');
            let contrasena = await AsyncStorage.getItem('contrasena');
            if (numDoc == null || contrasena == null) {
                return { success: false, message: 'No existe número de documento y/o contraseña guardados en el equipo' }
            }
            if (!isConnected) {
                return { success: false, message: 'No existe conexión estable ni archivo de datos para el usuario, por lo cual no es posible cargar datos' };
            } else {
                let request = services.service_url + services.secure_login + '/' + numDoc + '/' + contrasena;
                let response = await fetch(request);
                let singleResponse = response._bodyText;
                responseJson = JSON.parse(singleResponse);
            }
            var contents = JSON.stringify(responseJson);
            return contents;
        });
    },

    /**
     * Mediante este método se escriben los datos al archivo principal del usuario, donde
     * se encuentra toda la data que se maneja en la APK
     * @param {JSON} data Los datos a escribir en el archivo
     */
    async writeDataToMainFile(data) {
        let numDoc = await AsyncStorage.getItem('numDoc');
        if (numDoc == null) {
            return { success: false, message: 'No existe número de documento y/o contraseña guardados en el equipo' }
        }
        var fileUri = FileSystem.documentDirectory + 'ingelectrica_data_' + numDoc + '.json';
        let contents = JSON.stringify(data);
        await FileSystem.writeAsStringAsync(fileUri, contents);
    },

    /**
     * Mediante este método se envían los datos de los formularios al servicio para que sean
     * insertados en la base de datos. Estos datos se envían directamente desde el archivo, y
     * se espera una respuesta positiva del servicio, de lo contrario el archivo debe permanecer
     * como está para evitar pérdida de información.
     */
    sendData: async function () {
        var isConnectionAvailable = this.getConnectionStatus();
        return Promise.resolve(isConnectionAvailable).then(async (isConnected) => {
            if (!isConnected) {
                return { success: false, message: tags.etiquetas.sinc_no_conexion };
            } else {
                let numDoc = await AsyncStorage.getItem('numDoc');
                var fileUri = FileSystem.documentDirectory + 'ingelectrica_data_' + numDoc + '.json';
                let res = await FileSystem.getInfoAsync(fileUri);
                if (res.exists) {
                    let content = await FileSystem.readAsStringAsync(fileUri);
                    var contentJson = JSON.parse(content);
                    var contentString = JSON.stringify(contentJson);
                    let send = await fetch(services.service_url + services.saveDataFromAPK, {
                        method: 'POST',
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                        },
                        body: contentString,
                    });
                    return Promise.resolve(send).then((respuesta) => {
                        return respuesta;
                    })
                }
            }
        });
    },

    sendPictures: async function () {
        var isConnectionAvailable = this.getConnectionStatus();
        return Promise.resolve(isConnectionAvailable).then(async (isConnected) => {
            if (!isConnected) {
                return { success: false, message: tags.etiquetas.sinc_no_conexion };
            } else {
                let fileUri = file_name.archivos.picturesUri;
                let res = await FileSystem.getInfoAsync(fileUri);
                if (res.exists) {
                    let contentFiles = await FileSystem.readAsStringAsync(fileUri);
                    return Promise.resolve(contentFiles).then(async (cont) => {
                        let contJson = JSON.parse(cont);
                        contJson.map(async (filesInfo) => {
                            let rg = filesInfo.rg;
                            let fotosRg = filesInfo.images_rg;
                            let fotosPlacas = filesInfo.images_placas;
                            //Fotos RG
                            fotosRg.map(async (fotoRgUri, i) => {
                                let infoPicRg = await FileSystem.getInfoAsync(fotoRgUri);
                                if (infoPicRg.exists) {
                                    let contentFoto = await FileSystem.readAsStringAsync(fotoRgUri, {
                                        encoding: FileSystem.EncodingTypes.Base64,
                                    });
                                    let arrFotos = [];
                                    let objetoPersist = {
                                        nombre: fotoRgUri.substring(fotoRgUri.lastIndexOf('/') + 1),
                                        isPlaca: false,
                                        descripcion: 'Imagen RG cargada desde APK: ' + new Date(),
                                        id_orden_servicio: rg,
                                        contentType: 'image/jpeg',
                                        tipoFormulario: 'RG',
                                        numero_documento_persona: '',
                                        imagenBase64: contentFoto,
                                    }
                                    arrFotos.push(objetoPersist);
                                    let arrFotosJson = JSON.stringify(arrFotos);
                                    let serviceUrl = services.service_go_url + services.saveImg;
                                    let send = await fetch(serviceUrl, {
                                        method: 'POST',
                                        headers: {
                                            Accept: 'application/json',
                                            'Content-Type': 'application/json',
                                        },
                                        body: arrFotosJson,
                                    });
                                    return Promise.resolve(send).then(async (respuesta) => {
                                        if (respuesta.ok) {
                                            await FileSystem.deleteAsync(fotoRgUri);
                                            ToastAndroid.show('Imagen #' + (i + 1) + 'del RG' + rg + ' guardada correctamente', ToastAndroid.SHORT);
                                            if (i === fotosRg.length - 1) {
                                                ToastAndroid.show('Se han guardado todas las imágenes del RG ' + rg, ToastAndroid.SHORT);
                                            }
                                        }
                                        return respuesta;
                                    }).catch((err) => {
                                        console.log(err);
                                        return { success: false, message: err }
                                    })
                                }
                            })
                            //Fotos Placas
                            fotosPlacas.map(async (fotoPlacaUri, i) => {
                                let infoPicPlaca = await FileSystem.getInfoAsync(fotoPlacaUri);
                                if (infoPicPlaca.exists) {
                                    let contentFoto = await FileSystem.readAsStringAsync(fotoPlacaUri, {
                                        encoding: FileSystem.EncodingTypes.Base64,
                                    });
                                    let arrFotos = [];
                                    let objetoPersist = {
                                        nombre: fotoPlacaUri.substring(fotoPlacaUri.lastIndexOf('/') + 1),
                                        isPlaca: true,
                                        descripcion: 'Imagen RG cargada desde APK: ' + new Date(),
                                        id_orden_servicio: rg,
                                        contentType: 'image/jpeg',
                                        tipoFormulario: 'RG',
                                        numero_documento_persona: '',
                                        imagenBase64: contentFoto,
                                    }
                                    arrFotos.push(objetoPersist);
                                    let arrFotosJson = JSON.stringify(arrFotos);
                                    let send = await fetch(services.service_go_url + services.saveImg, {
                                        method: 'POST',
                                        headers: {
                                            Accept: 'application/json',
                                            'Content-Type': 'application/json',
                                        },
                                        body: arrFotosJson,
                                    });
                                    return Promise.resolve(send).then(async (respuesta) => {
                                        if (respuesta.ok) {
                                            await FileSystem.deleteAsync(fotoPlacaUri);
                                            ToastAndroid.show('Imagen #' + (i + 1) + 'de PLACA del RG' + rg + ' guardada correctamente', ToastAndroid.SHORT);
                                            if (i === fotosRg.length - 1) {
                                                ToastAndroid.show('Se han guardado todas las imágenes de PLACA del RG ' + rg, ToastAndroid.SHORT);
                                            }
                                        }
                                        return respuesta;
                                    })
                                }
                            });
                        })
                    })
                }
            }
        });
    },

    /**
     * Mediante este método se valida la disponibilidad de conexión de datos
     */
    async validarConexion() {
        return NetInfo.getConnectionInfo().then(async (connection) => {
            let connected = connection.type != 'none'
            let goodConnection = (connection.type == 'wifi') || (connection.type == 'cellular' && (connection.effectiveType == '3g' || connection.effectiveType == '4g'));
            return connected && goodConnection;
        });
    },

    /**
     * Carga los resultados de un servicio en un archivo
     * @param {*String} fileUri La URI del archivo al cual se le quieren escribir los valores
     * @param {*String} service La URL del servicio cuyo resultado se quiere escribir en el archivo
     * @param {*String} forceConnection Un flag indicando que se escriban los datos desde BD así el archvo exista
     */
    async cargarValoresAArchivo(fileUri, service, forceConnection) {
        let resFr = await FileSystem.getInfoAsync(fileUri);
        if (!resFr.exists || forceConnection) {
            let request = services.service_url + service;
            let response = await fetch(request);
            let singleResponse = response._bodyText;
            var contents = JSON.stringify(singleResponse);
            await FileSystem.writeAsStringAsync(fileUri, contents);
        }
    },

    /**
     * Trae las cantidades de órdenes según estado
     * @param {JSON} responseJson 
     */
    traerCantidadPorEstados: function (responseJson) {
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
            return { isSupervisor: isSupervisor, pendientes: contPendientes, enEjec: contEnEjecucion, ejecutadas: contEjecutadas };
        } else {
            return {};
        }
    },

    traerValorListados: async function () {
        var fileValorListadosUri = FileSystem.documentDirectory + 'valor_listados.json';
        return Promise.resolve(await FileSystem.getInfoAsync(fileValorListadosUri)).then(async (info) => {
            if (info.exists) {
                let content = await FileSystem.readAsStringAsync(fileValorListadosUri);
                return JSON.parse(content);
            } else {
                return {};
            }
        });
    },

    traerValoresDeArchivo: async function (fileUri) {
        return Promise.resolve(await FileSystem.getInfoAsync(fileUri)).then(async (info) => {
            if (info.exists) {
                let content = await FileSystem.readAsStringAsync(fileUri);
                return JSON.parse(content);
            } else {
                return {};
            }
        });
    },

    traerValorListadosPorLlaveListado: function (valorListadosJson, llave_listado, llavePadreNull) {
        return valorListadosJson.filter(valor => valor.llave_listado == llave_listado && (llavePadreNull ? (valor.llave_valor_padre == null || valor.llave_valor_padre == '') : true));
    },

    traerValorListadosPorLlaveListadoYValor: function (valorListadosJson, llave_listado, valorFiltro) {
        return valorListadosJson.filter(valor => valor.llave_listado == llave_listado && valor.valor == valorFiltro);
    },

    traerValorListadosPorLlaveListadoYLlavePadre: function (valorListadosJson, llave_listado, llave_padre) {
        return valorListadosJson.filter(valor => valor.llave_listado == llave_listado && valor.llave_valor_padre == llave_padre);
    },

    updateOrderStatus: function (order, new_status) {
        let newOrder = order.orden_servicio;
        newOrder.llave_estado = new_status;
        return newOrder;
    }
}

module.exports = DataHandler;