import React from 'react';
import {
    View, Text, KeyboardAvoidingView, Button, Alert,
    ScrollView, ProgressBarAndroid, AsyncStorage, Image,
    TouchableOpacity, StyleSheet, ToastAndroid, CameraRoll
} from 'react-native';

import { Input } from 'react-native-elements';

import {
    Picker, CheckBox, Body, DatePicker,
    ListItem,
} from 'native-base';

import {
    FileSystem,
    ImagePicker
} from 'expo';
import Icon from 'react-native-vector-icons/FontAwesome';

const tags = require('../constantes/etiquetas');
const DataHandler = require('./DataHandler');
const file_name = require('../constantes/nombresArchivos');
const llv_st = require('../constantes/llavesEstadoOrden');

export default class Rg extends React.Component {

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
            rg_actual: {},
            valor_listados: [],
            esBogota: false,
            causas_tecnicas: [],
            images_rg: [],
            images_placas: [],
            image: null,
        }
        this.alimentarCampos = this.alimentarCampos.bind(this);
        this.generarDesplegable = this.generarDesplegable.bind(this);
        this.generarDesplegableAnios = this.generarDesplegableAnios.bind(this);
        this.seleccionarImagen = this.seleccionarImagen.bind(this);
        this.updateItems = this.updateItems.bind(this);
        this.save = this.save.bind(this);
        this.savePics = this.savePics.bind(this);
        this.loadPics = this.loadPics.bind(this);
    }

    async componentDidMount() {
        try {
            this.setState({ isInProgress: true });
            let numDoc = await AsyncStorage.getItem('numDoc');
            if (this.state.status == null) {
                var fileUri = FileSystem.documentDirectory + 'ingelectrica_data_' + numDoc + '.json';
                let res = await FileSystem.getInfoAsync(fileUri);
                if (res.exists) {
                    let content = await FileSystem.readAsStringAsync(fileUri);
                    var contentJson = JSON.parse(content);
                    this.setState(contentJson);
                } else {
                    alert('No se encuentra el archivo de datos')
                }
            }
            const { navigation } = this.props;
            let response = navigation.getParam('response');
            let mensajeEstadoCambiado = navigation.getParam('mensajeEstadoCambiado')
            if (mensajeEstadoCambiado) {
                ToastAndroid.show('Se guardó el formulario RG exitosamente', ToastAndroid.SHORT)
            }
            var data = this.state.data;
            let idOrden = response.orden_servicio._id;
            data.forEach((value, index) => {
                if (value != null && value.orden_servicio != null && value.orden_servicio._id == idOrden) {
                    this.setState({ currentDataIndex: index });
                }
            });
            this.alimentarCampos(response);
        } catch (err) {
            console.log(err);
        }
    }

    async alimentarCampos(response) {
        this.setState({ isInProgress: true });
        let idOrdenRg = response.rg.id_orden_servicio;
        let ordenServicio = response.orden_servicio;
        let placa = response.placa_vehiculo;
        let valor_listados = DataHandler.traerValoresDeArchivo(file_name.archivos.valorListadosUri);
        var valorListadosJson = [];
        let bog = ordenServicio.municipio != null && ordenServicio.municipio.startsWith("L.");
        Promise.resolve(valor_listados).then((valor) => {
            valorListadosJson = JSON.parse(valor);
            this.setState({ valor_listados: valorListadosJson });
            let muncPromise;
            if (!bog) {
                muncPromise = DataHandler.traerValorListadosPorLlaveListadoYValor(valorListadosJson, 'MUNIC', ordenServicio.municipio);
            } else {
                muncPromise = DataHandler.traerValorListadosPorLlaveListadoYValor(valorListadosJson, 'LOC_BOG', ordenServicio.municipio);
            }
            Promise.resolve(muncPromise).then((muni) => {
                if (muni != null && muni.length > 0) {
                    let rg = { ...this.state.rg_actual };
                    if (!bog) {
                        rg.municipio = muni[0].llave;
                    } else {
                        rg.municipio = 'MUNIC_BOGOTA';
                        rg.localidad = muni[0].llave;
                    }
                    this.setState({ rg_actual: rg });
                }
            }).catch((err) => {
                this.setState({ isInProgress: false });
            })
            let causasPromise = DataHandler.traerValorListadosPorLlaveListado(valorListadosJson, 'CAUSAS_TECNICAS');
            Promise.resolve(causasPromise).then((causas) => {
                this.setState({ causas_tecnicas: causas });
            }).catch((err) => {
                this.setState({ isInProgress: false });
            })
        }).catch((err) => {
            this.setState({ isInProgress: false });
            ToastAndroid.show('Error al cargar los listados, por favor cierre sesión y actualice el archivo de listados', ToastAndroid.LONG);
        });
        this.setState({ esBogota: bog });
        let usr = JSON.parse(await AsyncStorage.getItem('user'));
        let procesosInterfaz = {
            LEV_AER: 'LEVANTAMIENTO DE INFORMACIÓN',
            LEV_SUB: 'LEVANTAMIENTO DE INFORMACIÓN',
            MARC: 'TIPO B: MARCACIÓN',
            MUEST: 'TIPO A: MUESTREO',
            MARC_MUEST: 'TIPO C: MUESTREO/MARCACIÓN',
        }
        let nombresProceso = {
            LEV_AER: 'Levantamiento de la información asociada equipos aéreos',
            LEV_SUB: 'Levantamiento de la información asociada equipos SE tipo local; capsulado o sotano.',
            MARC: 'Marcación',
            MUEST: 'Muestreo',
            MARC_MUEST: 'Marcación-Muestreo',
        }
        let keyActividad;
        for (var key in procesosInterfaz) {
            if (nombresProceso[key] === ordenServicio.actividad) {
                keyActividad = key;
            }
        }
        if (idOrdenRg != null) {
            try {
                this.setState({ rg_actual: response.rg })
            } catch (err) { ToastAndroid.show('Error al cargar datos, por favor ingrese nuevamente: ' + err, ToastAndroid.SHORT) }
        } else {
            let loc = DataHandler.traerValorListadosPorLlaveListadoYValor(valorListadosJson, 'LOC_BOG', ordenServicio.municipio);
            let locLlave = (bog && loc != null && loc.length > 0) ? loc[0].llave : null;
            this.setState({
                rg_actual: {
                    id_orden_servicio: ordenServicio.gom,
                    fecha_registro: new Date(),
                    barrio_lista: locLlave,
                    empresa_realizo_labor: tags.etiquetas.ingelectrica,
                    nombre_responsable: this.state.user.nombres + ' ' + this.state.user.apellidos,
                    id_usuario_responsable: this.state.user._id,
                    cd_nombre_cons: ordenServicio.activo,
                    cd_nombre_cons_encontrado: ordenServicio.activo,
                    tipo_equipo: null,
                    gom_orden_servicio: ordenServicio.gom,
                    orden_trabajo: ordenServicio.gom,
                    descargo: ordenServicio.descargo,
                    direccion_equipo_elemento: ordenServicio.direccion,
                    cordenadas_latitud: ordenServicio.latitud,
                    cordenadas_longitud: ordenServicio.longitud,
                    equipo_reparado: false,
                    numero_cuadrilla_placa_vehiculo: placa,
                }
            })
        }
        this.loadPics(ordenServicio.gom).then((pr) => {
            this.setState({ isInProgress: false });
        }).catch((err) => {
            this.setState({ isInProgress: false });
        });
    }

    async loadPics(gom) {
        let fileUri = file_name.archivos.picturesUri;
        let res = await FileSystem.getInfoAsync(fileUri);
        if (res.exists) {
            let content = await FileSystem.readAsStringAsync(fileUri);
            var contentJson = JSON.parse(content);
            var found = contentJson.find(function (element) {
                return element.rg == gom;
            });
            if (found != null) {
                this.setState({ images_placas: found.images_placas, images_rg: found.images_rg })
            }
        }
    }

    generarDesplegable(llaveListado, llavePadre, llavePadreNull, ignorarNoSelect) {
        let valores;
        if (llavePadre == null) {
            valores = DataHandler.traerValorListadosPorLlaveListado(this.state.valor_listados, llaveListado, llavePadreNull);
        } else {
            valores = DataHandler.traerValorListadosPorLlaveListadoYLlavePadre(this.state.valor_listados, llaveListado, llavePadre);
        }
        let items = valores.map((valor, i) => {
            return <Picker.Item key={i} label={valor.valor} value={valor.llave} />
        })
        if (ignorarNoSelect == null) {
            let defaultItem = <Picker.Item key={-1} label={'-Seleccione-'} value={null} />
            items.unshift(defaultItem);
        }
        return items;
    }

    generarDesplegableAnios() {
        let valores = [];
        var fecha = new Date();
        let year = fecha.getFullYear();
        for (year; year >= 1936; year--) {
            valores.push(year);
        }
        let items = valores.map((valor, i) => {
            return <Picker.Item key={i} label={'' + valor} value={'' + valor} />
        })
        let defaultItem = <Picker.Item key={-2} label={'-Seleccione-'} value={null} />
        let noVisible = <Picker.Item key={-1} label={'NO VISIBLE'} value={'NO VISIBLE'} />
        items.unshift(noVisible);
        items.unshift(defaultItem);
        return items;
    }

    async seleccionarImagen(camara, placa) {
        const { Permissions } = Expo;
        const { status, expires, permissions } = await Permissions.askAsync(Permissions.CAMERA, Permissions.CAMERA_ROLL)
        if (status === 'granted') {
            let dirInfo = await FileSystem.getInfoAsync(file_name.archivos.picturesFolderUri);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(file_name.archivos.picturesFolderUri).then((dir) => {
                    console.log('directorio creado')
                    console.log(dir);
                }).catch((err) => {
                    console.log('No se creó el directorio ');
                    console.log(err);
                });
            }
            let result;
            if (!camara) {
                result = await ImagePicker.launchImageLibraryAsync({
                    allowsEditing: false,
                    base64: true,
                });
            } else {
                result = await ImagePicker.launchCameraAsync({
                    allowsEditing: false,
                    base64: true,
                });
            }
            if (!result.cancelled) {
                let fileName = result.uri.substring(result.uri.lastIndexOf('/'));
                let newLocation = file_name.archivos.picturesFolderUri + fileName;
                await FileSystem.moveAsync(
                    {
                        from: result.uri,
                        to: newLocation,
                    }
                );
                let pics;
                if (placa) {
                    pics = this.state.images_placas;
                    pics.push(newLocation);
                    this.setState({ images_placas: pics })
                } else {
                    pics = this.state.images_rg;
                    pics.push(newLocation);
                    this.setState({ images_rg: pics })
                }
            }
        } else {
            alert(tags.etiquetas.rg_fotos_permiso_denegado);
        }
    }

    /**
     * Mediante este método se actualiza el registro actual en el estado, puesto
     * que el estado contiene los datos de todos los registros del usuadio
     */
    async updateItems() {
        let index = this.state.currentDataIndex;
        var newItem = this.state.rg_actual;
        this.setState(state => {
            const data = state.data.map((item, j) => {
                if (j == index) {
                    item.rg = newItem;
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
        this.updateItems();
        let dataNewStatus = this.state.data;
        let newOrder;
        let ordenActual = dataNewStatus[this.state.currentDataIndex].orden_servicio;
        let estadoActualEsPlanillaTrabajo = false;
        try {
            estadoActualEsPlanillaTrabajo = ordenActual.llave_estado == llv_st.llaves_estados.ST_OS_EJEC_PT;
        } catch (err) {
            console.log('error al validar el estado de orden: ' + err)
        }
        if (cambioEstado || estadoActualEsPlanillaTrabajo) {
            newOrder = DataHandler.updateOrderStatus(dataNewStatus[this.state.currentDataIndex], llv_st.llaves_estados.ST_OS_EJEC_PT);
        } else {
            newOrder = DataHandler.updateOrderStatus(dataNewStatus[this.state.currentDataIndex], llv_st.llaves_estados.ST_OS_EJEC_RG);
        }
        dataNewStatus[this.state.currentDataIndex].orden_servicio = newOrder;
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
        //¡OJO! DESCOMENTARIAR
        this.savePics();
        if (!cambioEstado) {
            ToastAndroid.show('Cambios guardados', ToastAndroid.SHORT);
        } else {
            const { navigation } = this.props;
            let response = navigation.getParam('response');
            navigation.navigate('PestanasFormularios', { response: response, mensajeEstadoCambiado: true });
        }
    }

    async savePics() {
        let fileUri = file_name.archivos.picturesUri;
        //await FileSystem.deleteAsync(fileUri);
        let objecToWrite = {
            rg: this.state.rg_actual.id_orden_servicio,
            images_placas: this.state.images_placas,
            images_rg: this.state.images_rg,
        }
        let registrosActuales = [];
        let res = await FileSystem.getInfoAsync(fileUri);
        if (res.exists) {
            let content = await FileSystem.readAsStringAsync(fileUri);
            var contentJson = JSON.parse(content);
            registrosActuales = contentJson;
            indexToReplace = -1;
            registrosActuales.map((reg, i) => {
                if (reg.rg == objecToWrite.rg) {
                    indexToReplace = i;
                }
            })
            if (indexToReplace >= 0) {
                registrosActuales[indexToReplace] = objecToWrite;
            } else {
                registrosActuales.push(objecToWrite);
            }
            //console.log('\n\nREGISTROS ACTUALES >>>>>>>>>>>>>>>>>\n\n' + JSON.stringify(registrosActuales) + '\n\n<<<<<<<<<<<<END REGISTROS ACTUALES')
        } else {
            registrosActuales.push(objecToWrite);
        }
        await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(registrosActuales));
        /*let content = await FileSystem.readAsStringAsync(fileUri);
        var contentJson = JSON.parse(content);*/
        //console.log('\n\nFILE CONTENT >>>>>>>>>>>>>>>>>\n\n' + JSON.stringify(contentJson) + '\n\n<<<<<<<<<<<<END FILE CONTENT');
    }

    render() {
        let l = this.state.causas_tecnicas;
        let { image } = this.state;
        return (
            <KeyboardAvoidingView behavior="position" keyboardVerticalOffset={150}>
                {!this.state.supervisor ?
                    <View style={styles.saveButton}>
                        <TouchableOpacity title='test' onPress={() => { this.save() }}
                            disabled={this.state.isInProgress}>
                            <Icon name="save" size={30} color="#fff" />
                        </TouchableOpacity>
                    </View> :
                    <View />
                }
                <ScrollView>
                    <View>
                        {this.state.isInProgress ? (
                            <ProgressBarAndroid color='#002A7C' />
                        ) : null}
                    </View>
                    <View pointerEvents={this.state.supervisor ? 'none' : 'auto'}>
                        <Text>{tags.etiquetas.rg_proveedor}</Text>
                        <Text style={{ fontWeight: 'bold' }}>{this.state.rg_actual.empresa_realizo_labor}</Text>
                        <Text>{tags.etiquetas.rg_nombre_responsable}</Text>
                        <Text style={{ fontWeight: 'bold' }}>{this.state.rg_actual.nombre_responsable}</Text>
                        <Text>{tags.etiquetas.rg_cd_nombre}</Text>
                        <Text style={{ fontWeight: 'bold' }}>{this.state.rg_actual.cd_nombre_cons}</Text>
                        <Text>{tags.etiquetas.rg_cd_nombre_enc}</Text>
                        <Input value={this.state.rg_actual.cd_nombre_cons_encontrado}
                            onChangeText={(value) => {
                                let rg = { ...this.state.rg_actual };
                                rg.cd_nombre_cons_encontrado = value;
                                this.setState({ rg_actual: rg });
                            }
                            } />
                        <Text>{tags.etiquetas.rg_tipo_equipo}</Text>
                        <Picker selectedValue={this.state.rg_actual.tipo_equipo}
                            onValueChange={(itemValue) => {
                                let rg = { ...this.state.rg_actual };
                                rg.tipo_equipo = itemValue;
                                this.setState({ rg_actual: rg });
                            }
                            }>
                            {this.generarDesplegable('TIPO_EQUI')}
                        </Picker>
                        <Text>{tags.etiquetas.rg_orden_trabajo}</Text>
                        <Input value={this.state.rg_actual.orden_trabajo}
                            onChangeText={(value) => {
                                let rg = { ...this.state.rg_actual };
                                rg.orden_trabajo = value;
                                this.setState({ rg_actual: rg });
                            }
                            } />
                        <Text>{tags.etiquetas.rg_descargo}</Text>
                        <Text style={{ fontWeight: 'bold' }}>{this.state.rg_actual.descargo}</Text>
                        <Text>{tags.etiquetas.rg_cantidad_placas}</Text>
                        <Picker selectedValue={this.state.rg_actual.cantidad_placas_equipo}
                            onValueChange={(itemValue) => {
                                let rg = { ...this.state.rg_actual };
                                rg.cantidad_placas_equipo = itemValue;
                                this.setState({ rg_actual: rg });
                            }
                            }>
                            {this.generarDesplegable('CANT_PLAC')}
                        </Picker>
                        <Text>{tags.etiquetas.rg_numero_serie}</Text>
                        <Input value={this.state.rg_actual.numero_serie_placa_fabricante}
                            onChangeText={(value) => {
                                let rg = { ...this.state.rg_actual };
                                rg.numero_serie_placa_fabricante = value;
                                this.setState({ rg_actual: rg });
                            }
                            } />
                        <View>
                            <ListItem>
                                <CheckBox checked={this.state.rg_actual.equipo_reparado}
                                    onPress={() => {
                                        let rg = { ...this.state.rg_actual };
                                        rg.equipo_reparado = !rg.equipo_reparado;
                                        if (!rg.equipo_reparado) {
                                            rg.empresa_realizo_reparacion = 'EMP_REP_NNG';
                                            rg.numero_seri_placa_reparacion = 'NO APLICA';
                                            rg.fecha_reparacion = null;
                                        }
                                        this.setState({ rg_actual: rg });
                                    }} />
                                <Body>
                                    <Text style={{ paddingLeft: 10 }}>{tags.etiquetas.rg_equipo_reparado}</Text>
                                </Body>
                            </ListItem>
                        </View>
                        {
                            this.state.rg_actual.equipo_reparado ?
                                <View>
                                    <Text>{tags.etiquetas.rg_empresa_reparacion}</Text>
                                    <Picker selectedValue={this.state.rg_actual.empresa_realizo_reparacion}
                                        onValueChange={(itemValue) => {
                                            let rg = { ...this.state.rg_actual };
                                            rg.empresa_realizo_reparacion = itemValue;
                                            this.setState({ rg_actual: rg });
                                        }
                                        }>
                                        {this.generarDesplegable('EMPR_REAL_REPA')}
                                    </Picker>
                                    <Text>{tags.etiquetas.rg_numero_serie_reparacion}</Text>
                                    <Input value={this.state.rg_actual.numero_seri_placa_reparacion}
                                        onChangeText={(value) => {
                                            let rg = { ...this.state.rg_actual };
                                            rg.numero_seri_placa_reparacion = value;
                                            this.setState({ rg_actual: rg });
                                        }
                                        } />
                                    <Text>{tags.etiquetas.rg_fecha_reparacion}</Text>
                                    <DatePicker
                                        placeHolderText={this.state.rg_actual.fecha_reparacion != null ? this.state.rg_actual.fecha_reparacion.toString().substring(0, 10) : '-Seleccione una fecha-'}
                                        onDateChange={(date) => {
                                            let rg = { ...this.state.rg_actual };
                                            rg.fecha_reparacion = date;
                                            this.setState({ rg_actual: rg });
                                        }}
                                    />
                                </View> : <View />
                        }
                        <Text>{tags.etiquetas.rg_empresa_labor}</Text>
                        <Text style={{ fontWeight: 'bold' }}>{this.state.rg_actual.empresa_realizo_labor}</Text>
                        <Text>{tags.etiquetas.rg_municipio}</Text>
                        <Picker selectedValue={this.state.rg_actual.municipio}
                            onValueChange={(itemValue) => {
                                let rg = { ...this.state.rg_actual };
                                rg.municipio = itemValue;
                                this.setState({ rg_actual: rg, esBogota: itemValue == 'MUNIC_BOGOTA' });
                            }
                            }>
                            {this.generarDesplegable('MUNIC', null, true)}
                        </Picker>
                        {
                            this.state.esBogota ?
                                <View>
                                    <Text>{tags.etiquetas.rg_localidad}</Text>
                                    <Picker selectedValue={this.state.rg_actual.localidad}
                                        onValueChange={(itemValue) => {
                                            let rg = { ...this.state.rg_actual };
                                            rg.localidad = itemValue;
                                            this.setState({ rg_actual: rg });
                                        }
                                        }>
                                        {this.generarDesplegable('LOC_BOG')}
                                    </Picker>
                                    <Text>{tags.etiquetas.rg_bario_vereda}</Text>
                                    <Input value={this.state.rg_actual.barrio_texto}
                                        onChangeText={(value) => {
                                            let rg = { ...this.state.rg_actual };
                                            rg.barrio_texto = value;
                                            this.setState({ rg_actual: rg });
                                        }
                                        } />
                                </View> :
                                <View>
                                    <Text>{tags.etiquetas.rg_bario_vereda}</Text>
                                    <Picker selectedValue={this.state.rg_actual.barrio_lista}
                                        onValueChange={(itemValue) => {
                                            let rg = { ...this.state.rg_actual };
                                            rg.barrio_lista = itemValue;
                                            this.setState({ rg_actual: rg });
                                        }
                                        }>
                                        {this.generarDesplegable('MUNIC', this.state.rg_actual.municipio)}
                                    </Picker>
                                </View>
                        }
                        <Text>{tags.etiquetas.rg_direccion}</Text>
                        <Input value={this.state.rg_actual.direccion_equipo_elemento}
                            onChangeText={(value) => {
                                let rg = { ...this.state.rg_actual };
                                rg.direccion_equipo_elemento = value;
                                this.setState({ rg_actual: rg });
                            }
                            } />
                        <Text>{tags.etiquetas.rg_equipo_encontrado}</Text>
                        <Picker selectedValue={this.state.rg_actual.equipo_encntrado}
                            onValueChange={(itemValue) => {
                                let rg = { ...this.state.rg_actual };
                                rg.equipo_encntrado = itemValue;
                                this.setState({ rg_actual: rg });
                            }
                            }>
                            {this.generarDesplegable('EQUIPO_ENC')}
                        </Picker>
                        <Text>{tags.etiquetas.rg_latitud}</Text>
                        <Input value={'' + this.state.rg_actual.cordenadas_latitud}
                            keyboardType='phone-pad'
                            onChangeText={(value) => {
                                let rg = { ...this.state.rg_actual };
                                rg.cordenadas_latitud = value;
                                this.setState({ rg_actual: rg });
                            }
                            } />
                        <Text>{tags.etiquetas.rg_longitud}</Text>
                        <Input value={'' + this.state.rg_actual.cordenadas_longitud}
                            keyboardType='phone-pad'
                            onChangeText={(value) => {
                                let rg = { ...this.state.rg_actual };
                                rg.cordenadas_longitud = value;
                                this.setState({ rg_actual: rg });
                            }
                            } />
                        <View>
                            <ListItem>
                                <CheckBox checked={this.state.rg_actual.requiere_gestor}
                                    onPress={() => {
                                        let rg = { ...this.state.rg_actual };
                                        rg.requiere_gestor = !rg.requiere_gestor;
                                        this.setState({ rg_actual: rg });
                                    }} />
                                <Body>
                                    <Text style={{ paddingLeft: 10 }}>{tags.etiquetas.rg_requiere_gestor}</Text>
                                </Body>
                            </ListItem>
                        </View>
                        <Text>{tags.etiquetas.rg_descripcion_zona_riesgo}</Text>
                        <Picker selectedValue={this.state.rg_actual.descripcion_zona}
                            onValueChange={(itemValue) => {
                                let rg = { ...this.state.rg_actual };
                                rg.descripcion_zona = itemValue;
                                let codZona = DataHandler.traerValorListadosPorLlaveListadoYLlavePadre(this.state.valor_listados, 'CODI_ZONA', itemValue);
                                if (codZona != null && codZona.length > 0) {
                                    rg.codigo_zona = codZona[0].llave;
                                }
                                this.setState({ rg_actual: rg });
                            }
                            }>
                            {this.generarDesplegable('DESC_ZONA')}
                        </Picker>
                        <Text>{tags.etiquetas.rg_codigo_zona_riesgo}</Text>
                        <Picker selectedValue={this.state.rg_actual.codigo_zona}
                            onValueChange={(itemValue) => {
                                let rg = { ...this.state.rg_actual };
                                rg.codigo_zona = itemValue;
                                this.setState({ rg_actual: rg });
                            }
                            }>
                            {this.generarDesplegable('CODI_ZONA', this.state.rg_actual.descripcion_zona)}
                        </Picker>
                        <Text>{tags.etiquetas.rg_estado_equipo}</Text>
                        <Picker selectedValue={this.state.rg_actual.estado_equipo}
                            onValueChange={(itemValue) => {
                                let rg = { ...this.state.rg_actual };
                                rg.estado_equipo = itemValue;
                                this.setState({ rg_actual: rg });
                            }
                            }>
                            {this.generarDesplegable('ESTA_EQUI')}
                        </Picker>
                        <Text>{tags.etiquetas.rg_marca_transformador}</Text>
                        <Picker selectedValue={this.state.rg_actual.marca_equipo}
                            onValueChange={(itemValue) => {
                                let rg = { ...this.state.rg_actual };
                                rg.marca_equipo = itemValue;
                                this.setState({ rg_actual: rg });
                            }
                            }>
                            {this.generarDesplegable('MARC_EQUI')}
                        </Picker>
                        <Text>{tags.etiquetas.rg_pais_fabricacion}</Text>
                        <Picker selectedValue={this.state.rg_actual.pais_fabricante}
                            onValueChange={(itemValue) => {
                                let rg = { ...this.state.rg_actual };
                                rg.pais_fabricante = itemValue;
                                this.setState({ rg_actual: rg });
                            }
                            }>
                            {this.generarDesplegable('PAIS_FABR')}
                        </Picker>
                        <Text>{tags.etiquetas.rg_potencia_kva}</Text>
                        <Picker selectedValue={this.state.rg_actual.potencia}
                            onValueChange={(itemValue) => {
                                let rg = { ...this.state.rg_actual };
                                rg.potencia = itemValue;
                                this.setState({ rg_actual: rg });
                            }
                            }>
                            {this.generarDesplegable('POTE_KVA')}
                        </Picker>
                        <Text>{tags.etiquetas.rg_anio_fabricacion}</Text>
                        <Picker selectedValue={this.state.rg_actual.ano_fabricacion}
                            onValueChange={(itemValue) => {
                                let rg = { ...this.state.rg_actual };
                                rg.ano_fabricacion = itemValue;
                                this.setState({ rg_actual: rg });
                            }
                            }>
                            {this.generarDesplegableAnios()}
                        </Picker>
                        <Text>{tags.etiquetas.rg_cuadrilla_placa}</Text>
                        <Text style={{ fontWeight: 'bold' }}>{this.state.rg_actual.numero_cuadrilla_placa_vehiculo}</Text>
                        <Text>{tags.etiquetas.rg_cantidad_placas}</Text>
                        <Picker selectedValue={this.state.rg_actual.marcacion_encontrada}
                            onValueChange={(itemValue) => {
                                let rg = { ...this.state.rg_actual };
                                rg.marcacion_encontrada = itemValue;
                                if (itemValue == 'MARC_ENCO_SIN' || itemValue == 'MARC_ENCO_NA') {
                                    rg.ideam = (rg.ideam != null && rg.ideam != '') ? 'SIN PLACA' : '';
                                    rg.serie = (rg.ideam != null && rg.ideam != '') ? 'SIN PLACA' : '';
                                }
                                this.setState({ rg_actual: rg });
                            }
                            }>
                            {this.generarDesplegable('MARC_ENCO')}
                        </Picker>
                        {
                            this.state.rg_actual.marcacion_encontrada == 'MARC_ENCO_DOS' ?
                                <View>
                                    <Text>{tags.etiquetas.rg_ideam}</Text>
                                    <Input value={this.state.rg_actual.ideam}
                                        onChangeText={(value) => {
                                            let rg = { ...this.state.rg_actual };
                                            rg.ideam = value;
                                            this.setState({ rg_actual: rg });
                                        }
                                        } />
                                    <Text>{tags.etiquetas.rg_serie_placa}</Text>
                                    <Input value={this.state.rg_actual.serie}
                                        onChangeText={(value) => {
                                            let rg = { ...this.state.rg_actual };
                                            rg.serie = value;
                                            this.setState({ rg_actual: rg });
                                        }
                                        } />
                                </View> :
                                (this.state.rg_actual.marcacion_encontrada == 'MARC_ENCO_VERDE') ?
                                    <View>
                                        <Text>{tags.etiquetas.rg_ideam}</Text>
                                        <Input value={this.state.rg_actual.ideam}
                                            onChangeText={(value) => {
                                                let rg = { ...this.state.rg_actual };
                                                rg.ideam = value;
                                                this.setState({ rg_actual: rg });
                                            }
                                            } />
                                    </View> :
                                    (this.state.rg_actual.marcacion_encontrada == 'MARC_ENCO_PL_BL') ?
                                        <View>
                                            <Text>{tags.etiquetas.rg_serie_placa}</Text>
                                            <Input value={this.state.rg_actual.serie}
                                                onChangeText={(value) => {
                                                    let rg = { ...this.state.rg_actual };
                                                    rg.serie = value;
                                                    this.setState({ rg_actual: rg });
                                                }
                                                } />
                                        </View> : <View />
                        }
                        <View>
                            <ListItem>
                                <CheckBox checked={this.state.rg_actual.hermeticante_sellado}
                                    onPress={() => {
                                        let rg = { ...this.state.rg_actual };
                                        rg.hermeticante_sellado = !rg.hermeticante_sellado;
                                        this.setState({ rg_actual: rg });
                                    }} />
                                <Body>
                                    <Text style={{ paddingLeft: 10 }}>{tags.etiquetas.rg_hermeticamente_sellado}</Text>
                                </Body>
                            </ListItem>
                        </View>
                        <Text>{tags.etiquetas.rg_tipo_aislamiento}</Text>
                        <Picker selectedValue={this.state.rg_actual.tipo_aislamiento}
                            onValueChange={(itemValue) => {
                                let rg = { ...this.state.rg_actual };
                                rg.tipo_aislamiento = itemValue;
                                this.setState({ rg_actual: rg });
                            }
                            }>
                            {this.generarDesplegable('TIPO_AISL')}
                        </Picker>
                        <Text>{tags.etiquetas.rg_observaciones}</Text>
                        <Input value={this.state.rg_actual.observaciones}
                            multiline={true}
                            numberOfLines={3}
                            onChangeText={(value) => {
                                let rg = { ...this.state.rg_actual };
                                rg.observaciones = value;
                                this.setState({ rg_actual: rg });
                            }
                            } />
                        <Text>{tags.etiquetas.rg_viable}</Text>
                        <Picker selectedValue={this.state.rg_actual.viable}
                            onValueChange={(itemValue) => {
                                let rg = { ...this.state.rg_actual };
                                rg.viable = itemValue;
                                this.setState({ rg_actual: rg });
                            }
                            }>
                            {this.generarDesplegable('RG_VIABILIDAD')}
                        </Picker>
                        {
                            this.state.rg_actual.viable != null
                                && (this.state.rg_actual.viable == 'RG_VIABILIDAD_NV'
                                    || this.state.rg_actual.viable == 'RG_VIABILIDAD_NUBC'
                                    || this.state.rg_actual.viable == 'RG_VIABILIDAD_NA'
                                    || this.state.rg_actual.viable == 'RG_VIABILIDAD_MRC') ?
                                <View>
                                    <Text>{tags.etiquetas.rg_causas_tecnicas}</Text>
                                    {
                                        this.state.causas_tecnicas.map((l) => (
                                            <ListItem key={l.llave}>
                                                <CheckBox checked={this.state.rg_actual.causa_tecnica != null && this.state.rg_actual.causa_tecnica.includes(l.llave)}
                                                    onPress={() => {
                                                        let rg = { ...this.state.rg_actual };
                                                        if (rg.causa_tecnica == null) {
                                                            rg.causa_tecnica = l.llave;
                                                        } else {
                                                            if (rg.causa_tecnica.includes(l.llave)) {
                                                                let toReplace = l.llave + ',';
                                                                let replaced = rg.causa_tecnica.replace(toReplace, '');
                                                                replaced = replaced.replace(l.llave, '');
                                                                rg.causa_tecnica = replaced;
                                                            } else {
                                                                rg.causa_tecnica = rg.causa_tecnica + ',' + l.llave;
                                                            }
                                                        }
                                                        this.setState({ rg_actual: rg });
                                                    }} />
                                                <Body>
                                                    <Text style={{ paddingLeft: 10 }}>{l.valor}</Text>
                                                </Body>
                                            </ListItem>
                                        ))
                                    }
                                    <Text>{tags.etiquetas.rg_causa}</Text>
                                    <Picker selectedValue={this.state.rg_actual.causa_no_viable}
                                        onValueChange={(itemValue) => {
                                            let rg = { ...this.state.rg_actual };
                                            rg.causa_no_viable = itemValue;
                                            this.setState({ rg_actual: rg });
                                        }
                                        }>
                                        {this.generarDesplegable('CAUSAS_NO_VIABLE')}
                                    </Picker>
                                    <Text>{tags.etiquetas.rg_observaciones_causa}</Text>
                                    <Input value={this.state.rg_actual.observaciones_dos}
                                        multiline={true}
                                        numberOfLines={3}
                                        onChangeText={(value) => {
                                            let rg = { ...this.state.rg_actual };
                                            rg.observaciones_dos = value;
                                            this.setState({ rg_actual: rg });
                                        }
                                        } />
                                </View> :
                                <View />
                        }
                        <View style={{ height: 15 }} />
                        {!this.state.supervisor ?
                            <View>
                                <Button
                                    title={tags.etiquetas.rg_agregar_fotos_rg}
                                    onPress={() => {
                                        Alert.alert(
                                            tags.etiquetas.rg_titulo_dialogo_fotos,
                                            tags.etiquetas.rg_mensaje_dialogo_fotos,
                                            [
                                                {
                                                    text: tags.etiquetas.rg_fotos_galeria,
                                                    onPress: async () => { this.seleccionarImagen(false, false) }
                                                },
                                                {
                                                    text: tags.etiquetas.rg_fotos_camara,
                                                    onPress: async () => { this.seleccionarImagen(true, false) },
                                                },
                                                {
                                                    text: tags.etiquetas.btn_cancelar,
                                                    onPress: () => { },
                                                    style: 'cancel',
                                                },

                                            ],
                                            { cancelable: false },
                                        );
                                    }}
                                />
                                <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
                                    {
                                        this.state.images_rg.map((img, i) => {
                                            return <View key={i} style={{ width: '50%' }} >
                                                <TouchableOpacity style={{ paddingLeft: 5, paddingTop: 5, backgroundColor: '#002A7C' }}
                                                    onPress={() => {
                                                        let imgs = this.state.images_rg;
                                                        imgs.splice(i, 1);
                                                        this.setState({ images_rg: imgs });
                                                    }}>
                                                    <Icon name="trash" size={15} color='#fff' />
                                                </TouchableOpacity>
                                                <Image source={{ uri: img }} style={{ width: '100%', height: 250 }} />
                                                <View style={{ height: 5 }} />
                                            </View>
                                        })
                                    }
                                </View>
                                <View style={{ height: 10 }} />
                                <Button
                                    title={tags.etiquetas.rg_agregar_fotos_pc}
                                    onPress={() => {
                                        Alert.alert(
                                            tags.etiquetas.rg_titulo_dialogo_fotos,
                                            tags.etiquetas.rg_mensaje_dialogo_fotos,
                                            [
                                                {
                                                    text: tags.etiquetas.rg_fotos_galeria,
                                                    onPress: async () => { this.seleccionarImagen(false, true) }
                                                },
                                                {
                                                    text: tags.etiquetas.rg_fotos_camara,
                                                    onPress: async () => { this.seleccionarImagen(true, true) },
                                                },
                                                {
                                                    text: tags.etiquetas.btn_cancelar,
                                                    onPress: () => { },
                                                    style: 'cancel',
                                                },

                                            ],
                                            { cancelable: false },
                                        );
                                    }}
                                />
                                <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
                                    {
                                        this.state.images_placas.map((img, i) => {
                                            return <View key={i} style={{ width: '50%' }} >
                                                <TouchableOpacity style={{ paddingLeft: 5, paddingTop: 5, backgroundColor: '#002A7C' }}
                                                    onPress={() => {
                                                        let imgs = this.state.images_placas;
                                                        imgs.splice(i, 1);
                                                        this.setState({ images_placas: imgs });
                                                    }}>
                                                    <Icon name="trash" size={15} color='#fff' />
                                                </TouchableOpacity>
                                                <Image source={{ uri: img }} style={{ width: '100%', height: 250 }} />
                                            </View>
                                        })
                                    }
                                </View>
                                <View style={{ height: 10 }} />
                                <Button
                                    title={tags.etiquetas.btn_guardar}
                                    onPress={() => { this.save(true) }} />
                            </View> :
                            <View />
                        }
                    </View>
                </ScrollView>
            </KeyboardAvoidingView >
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