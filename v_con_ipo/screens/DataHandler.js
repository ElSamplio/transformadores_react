import { FileSystem } from 'expo';
import { AsyncStorage, NetInfo } from "react-native"
const services = require('../constantes/servicios.js');
const llv_st = require('../constantes/llavesEstadoOrden');

var DataHandler = {

    refreshData: function () {
        var isConnectionAvailable = NetInfo.getConnectionInfo().then(async (connection) => {
            let connected = connection.type != 'none'
            let goodConnection = (connection.type == 'wifi') || (connection.type == 'cellular' && (connection.effectiveType == '3g' || connection.effectiveType == '4g'));
            return connected && goodConnection;
        });
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
     * Carga los resultados de un servicio en un archivo
     * @param {*String} fileUri 
     * @param {*String} service 
     */
    async cargarValoresAArchivo(fileUri, service) {
        let resFr = await FileSystem.getInfoAsync(fileUri);
        if (!resFr.exists) {
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

    traerValorListadosPorLlaveListado: function (valorListadosJson, llave_listado) {
        return valorListadosJson.filter(valor => valor.llave_listado == llave_listado);
    },

    traerValorListadosPorLlaveListadoYValor: function (valorListadosJson, llave_listado, valorFiltro) {
        return valorListadosJson.filter(valor => valor.llave_listado == llave_listado && valor.valor == valorFiltro);
    },

    updateOrderStatus: function (order, new_status) {
        let newOrder = order.orden_servicio;
        newOrder.llave_estado = new_status;
        return newOrder;
    }
}

module.exports = DataHandler;