import React from 'react';
import {
    ScrollView, Text, View, ProgressBarAndroid,
    Button, StyleSheet, AsyncStorage, DatePickerAndroid,
    TouchableOpacity, Picker, KeyboardAvoidingView,
    ToastAndroid, CheckBox, TouchableHighlight
} from 'react-native';
import {
    Input
} from 'react-native-elements'
import {
    Collapse, CollapseHeader, CollapseBody
} from "accordion-collapse-react-native";
import Icon from 'react-native-vector-icons/FontAwesome';
import { withNavigation } from 'react-navigation';
import { FileSystem } from 'expo';
import DataHandler from './DataHandler'
const llv_st = require('../constantes/llavesEstadoOrden');
const file_name = require('../constantes/nombresArchivos');

const tags = require('../constantes/etiquetas')

class Ipo extends React.Component {

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
            ipo_actual: {},
            sectionsCollapsed: false,
            botonGuardarVisible: false,
            valor_listados: [],
            esBogota: false,
            grupo_riesgo: [],
            lista_riesgos: [],
        }
        this.updateItems = this.updateItems.bind(this);
        this.alimentarCampos = this.alimentarCampos.bind(this);
        this.abrirFechaProceso = this.abrirFechaProceso.bind(this);
        this.abrirFechaEjecucion = this.abrirFechaEjecucion.bind(this);
        this.save = this.save.bind(this);
        this.generarDesplegable = this.generarDesplegable.bind(this);
        this.cambiarValorRiesgo = this.cambiarValorRiesgo.bind(this);
        this.obtenerRiesgoPorLlave = this.obtenerRiesgoPorLlave.bind(this);
    }

    async componentDidMount() {
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
                alert('No se encuentra el acchivo de datos')
            }
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
        this.setState({ isInProgress: false });
    }

    async alimentarCampos(response) {
        this.setState({ isInProgress: true });
        let idOrdenIpo = response.ipo.id_orden_servicio;
        let ordenServicio = response.orden_servicio;
        let valor_listados = DataHandler.traerValoresDeArchivo(file_name.archivos.valorListadosUri);
        var valorListadosJson = [];
        Promise.resolve(valor_listados).then((valor) => {
            valorListadosJson = JSON.parse(valor);
            this.setState({ valor_listados: valorListadosJson });
        });
        let grupo_riesgo = DataHandler.traerValoresDeArchivo(file_name.archivos.grupoRiesgoUri);
        var grupoRiesgosJson = [];
        Promise.resolve(grupo_riesgo).then((grupo) => {
            grupoRiesgosJson = JSON.parse(grupo);
            this.setState({ grupo_riesgo: grupoRiesgosJson })
        })
        let lista_riesgos = DataHandler.traerValoresDeArchivo(file_name.archivos.riesgoSeguridadUri);
        var listaRiesgosJson = [];
        Promise.resolve(lista_riesgos).then((riesgo) => {
            listaRiesgosJson = JSON.parse(riesgo);
            this.setState({ lista_riesgos: listaRiesgosJson })
            let identificacion_riesgos = [];
            listaRiesgosJson.map((rg, i) => {
                let ide_rsg = {
                    pre: false,
                    ejec: false,
                    llave_riesgo: rg.llave,
                    medida_control: '',
                }
                identificacion_riesgos.push(ide_rsg);
            });
            let ipo = { ...this.state.ipo_actual };
            if (ipo.identificacion_riesgos == null) {
                ipo.identificacion_riesgos = identificacion_riesgos;
                this.setState({ ipo_actual: ipo });
            }
        })
        let bog = ordenServicio.municipio != null && ordenServicio.municipio.startsWith("L.");
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
        if (idOrdenIpo != null) {
            this.setState({ ipo_actual: response.ipo })
        } else {
            let loc = DataHandler.traerValorListadosPorLlaveListadoYValor(valorListadosJson, 'LOC_BOG', ordenServicio.municipio);
            let locLlave = (bog && loc != null) ? loc[0].llave : null;
            this.setState({
                ipo_actual: {
                    id_orden_servicio: ordenServicio.gom,
                    fecha_registro: new Date(),
                    nombre_empresa_colaboradora: tags.etiquetas.ipo_empresa_colaboradora_ing,
                    responsable_visita_levantamiento: this.state.user.nombres + ' ' + this.state.user.apellidos,
                    coordinador_codensa: tags.etiquetas.ipo_coordinador_codensa_mv,
                    actividad: ordenServicio.actividad,
                    tipo_grupo_tecnico: procesosInterfaz[keyActividad],
                    proceso: procesosInterfaz[keyActividad],
                    fecha_proceso: response.fecha_programacion,
                    tipo_sector: null,
                    cordenadas_x: ordenServicio.latitud,
                    cordenadas_y: ordenServicio.longitud,
                    actividad: nombresProceso[keyActividad],
                    direccion: ordenServicio.direccion,
                    localidad_barrio_list: locLlave,
                    hospital_cercano: '',
                    nivel_tension: null,
                    tipo_trabajo: null,
                    tipo_red: null,
                    tipo_subestacion: null,
                    datos_infraestructura_cd: 'C_D',
                    datos_infraestructura_circuito: ordenServicio.uc,
                    datos_infraestructura_numero_apoyo: null,
                    trabajos_lines: null,
                    responsabilidad_de_la_ejecucion_de_trabajos: 'DESC_GO',
                    numero_resposabilidad_ejecucion_de_trabajos: ordenServicio.descargo,
                    movil: usr.telefono_movil,
                    placa: response.placa_vehiculo,
                    insp_pre_vehiculo: false,
                    fecha_ejecucion: response.fecha_programacion,
                    identificacion_riesgos: [],
                }
            })
        }
        this.setState({ isInProgress: false });
    }

    async abrirFechaProceso() {
        try {
            //como la fecha se está guardando en formato dd/MM/yyyy, se debe cambiar para que se pueda
            //leer, se cambiará esto guardando este dato como tipo fecha una vez se implemente
            //la nueva app
            let elsFecha = this.state.ipo_actual.fecha_proceso.split("/");
            let fechaString = elsFecha[2] + '-' + elsFecha[1] + '-' + elsFecha[0];
            const { action, year, month, day } = await DatePickerAndroid.open({
                date: new Date(fechaString),
            });
            if (action !== DatePickerAndroid.dismissedAction) {
                let fechaSeleccionadaString = day + '/' + (month + 1) + '/' + year;
                let ipo = { ...this.state.ipo_actual };
                ipo.fecha_proceso = fechaSeleccionadaString;
                ipo.fecha_ejecucion = fechaSeleccionadaString;
                this.setState({ ipo_actual: ipo });
            }
        } catch ({ code, message }) {
            console.warn('Cannot open date picker', message);
        }
    }

    async abrirFechaEjecucion() {
        try {
            //como la fecha se está guardando en formato dd/MM/yyyy, se debe cambiar para que se pueda
            //leer, se cambiará esto guardando este dato como tipo fecha una vez se implemente
            //la nueva app
            let elsFecha = this.state.ipo_actual.fecha_proceso.split("/");
            let fechaString = elsFecha[2] + '-' + elsFecha[1] + '-' + elsFecha[0];
            const { action, year, month, day } = await DatePickerAndroid.open({
                date: new Date(fechaString),
            });
            if (action !== DatePickerAndroid.dismissedAction) {
                let fechaSeleccionadaString = day + '/' + (month + 1) + '/' + year;
                let ipo = { ...this.state.ipo_actual };
                ipo.fecha_ejecucion = fechaSeleccionadaString;
                this.setState({ ipo_actual: ipo });
            }
        } catch ({ code, message }) {
            console.warn('Cannot open date picker', message);
        }
    }

    async updateItems() {
        let index = this.state.currentDataIndex;
        var newItem = this.state.ipo_actual;
        this.setState(state => {
            const data = state.data.map((item, j) => {
                if (j == index) {
                    item.ipo = newItem;
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

    async save() {
        this.updateItems();
        let dataNewStatus = this.state.data;
        let newOrder = DataHandler.updateOrderStatus(dataNewStatus[this.state.currentDataIndex], llv_st.llaves_estados.ST_OS_EJEC_IPO);
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
        let content = await FileSystem.readAsStringAsync(fileUri);
        var contentJson = JSON.parse(content);
        //console.log('\n\nFILE CONTENT >>>>>>>>>>>>>>>>>\n\n' + JSON.stringify(contentJson) + '\n\n<<<<<<<<<<<<END FILE CONTENT');
        ToastAndroid.show('Cambios guardados', ToastAndroid.SHORT);
    }

    generarDesplegable(llaveListado) {
        let valores = DataHandler.traerValorListadosPorLlaveListado(this.state.valor_listados, llaveListado);
        let items = valores.map((valor, i) => {
            return <Picker.Item key={i} label={valor.valor} value={valor.llave} />
        })
        let defaultItem = <Picker.Item key={-1} label={'-Seleccione-'} value={null} />
        items.unshift(defaultItem);
        return items;
    }

    cambiarValorRiesgo(llave, valorACambiar, nuevoValor) {
        let ipo = { ...this.state.ipo_actual };
        let identificacion_riesgos = ipo.identificacion_riesgos;
        let rsk = identificacion_riesgos.filter(riesgo => riesgo.llave_riesgo == llave);
        let index = identificacion_riesgos.findIndex(riesgo => riesgo.llave_riesgo == llave);
        let rskJSON = rsk[0];
        if (rskJSON.llave_riesgo == llave) {
            if (valorACambiar == 'PRE') {
                rskJSON.pre = !rskJSON.pre;
            } else if (valorACambiar == 'EJEC') {
                rskJSON.ejec = !rskJSON.ejec;
            } else {
                rskJSON.medida_control = nuevoValor;
            }
        }
        ipo.identificacion_riesgos = identificacion_riesgos;
        this.setState({ ipo_actual: ipo });
    }

    obtenerRiesgoPorLlave(llave, atr) {
        if (this.state.ipo_actual != null && this.state.ipo_actual.identificacion_riesgos != null) {
            let rsk = this.state.ipo_actual.identificacion_riesgos.filter(riesgo => riesgo.llave_riesgo == llave);
            let rskJson = rsk[0];
            if (rskJson != null) {
                if (atr == 'PRE') {
                    return rskJson.pre;
                } else if (atr == 'EJEC') {
                    return rskJson.ejec;
                } else {
                    return rskJson.medida_control;
                }
            }
        }
        return null;
    }

    render() {
        const { navigation } = this.props;
        let response = navigation.getParam('response');
        let grupoRiesgoJson = this.state.grupo_riesgo;
        let listaRiesgosJson = this.state.lista_riesgos;
        return (
            <KeyboardAvoidingView behavior="position" keyboardVerticalOffset={150}>
                <ScrollView>
                    <View>
                        {this.state.isInProgress ? (
                            <ProgressBarAndroid color='#002A7C' />
                        ) : null}
                    </View>
                    <View>
                        <Collapse isCollapsed={this.state.sectionsCollapsed}
                            onToggle={() => { this.setState({ sectionsCollapsed: true, botonGuardarVisible: true }) }}>
                            <CollapseHeader style={styles.collapsibleHeader}>
                                <View>
                                    <Text style={styles.collapsibleHeaderText}>{tags.etiquetas.ipo_header_one}</Text>
                                </View>
                            </CollapseHeader>
                            <CollapseBody pointerEvents={this.state.supervisor ? 'none' : 'auto'}>
                                <Text>{tags.etiquetas.ipo_empresa_colaboradora}</Text>
                                <Text style={{ fontWeight: 'bold' }}>{this.state.ipo_actual.nombre_empresa_colaboradora}</Text>
                                <Text>{tags.etiquetas.ipo_responsable_visita}</Text>
                                <Text style={{ fontWeight: 'bold' }}>{this.state.ipo_actual.responsable_visita_levantamiento}</Text>
                                <Text>{tags.etiquetas.ipo_coordinador_codensa}</Text>
                                <Text style={{ fontWeight: 'bold' }}>{tags.etiquetas.ipo_coordinador_codensa_mv}</Text>
                                <Text>{tags.etiquetas.ipo_proceso}</Text>
                                <Text style={{ fontWeight: 'bold' }}>{this.state.ipo_actual.proceso}</Text>
                                <Text>{tags.etiquetas.ipo_fecha_proceso}</Text>
                                <Button title={this.state.ipo_actual.fecha_proceso != null ? this.state.ipo_actual.fecha_proceso : response.fecha_programacion}
                                    onPress={() => this.abrirFechaProceso()} />
                                <Text>{tags.etiquetas.ipo_tipo_grupo}</Text>
                                <Text style={{ fontWeight: 'bold' }}>{this.state.ipo_actual.tipo_grupo_tecnico}</Text>
                                <Text>{tags.etiquetas.ipo_tipo_sector}</Text>
                                <Picker selectedValue={this.state.ipo_actual.tipo_sector}
                                    onValueChange={(itemValue) => {
                                        let ipo = { ...this.state.ipo_actual };
                                        ipo.tipo_sector = itemValue;
                                        this.setState({ ipo_actual: ipo });
                                    }
                                    }>
                                    {this.generarDesplegable('TIPO_SECT')}
                                </Picker>
                                <Text>{tags.etiquetas.ipo_coordenada_x}</Text>
                                <Input value={this.state.ipo_actual.cordenadas_x}
                                    keyboardType='phone-pad'
                                    onChangeText={(value) => {
                                        let ipo = { ...this.state.ipo_actual };
                                        ipo.cordenadas_x = value;
                                        this.setState({ ipo_actual: ipo });
                                    }
                                    } />
                                <Text>{tags.etiquetas.ipo_coordenada_y}</Text>
                                <Input value={this.state.ipo_actual.cordenadas_y}
                                    keyboardType='phone-pad'
                                    onChangeText={(value) => {
                                        let ipo = { ...this.state.ipo_actual };
                                        ipo.cordenadas_y = value;
                                        this.setState({ ipo_actual: ipo });
                                    }
                                    } />
                                <Text>{tags.etiquetas.ipo_actividad}</Text>
                                <Text style={{ fontWeight: 'bold' }}>{this.state.ipo_actual.actividad}</Text>
                                <Text>{tags.etiquetas.ipo_direccion}</Text>
                                <Input value={this.state.ipo_actual.direccion}
                                    onChangeText={(value) => {
                                        let ipo = { ...this.state.ipo_actual };
                                        ipo.direccion = value;
                                        this.setState({ ipo_actual: ipo });
                                    }
                                    } />
                                <Text>{tags.etiquetas.ipo_localidad_barrio}</Text>
                                {
                                    this.state.esBogota ?
                                        <Picker
                                            selectedValue={this.state.ipo_actual.localidad_barrio_list}
                                            onValueChange={(itemValue) => {
                                                let ipo = { ...this.state.ipo_actual };
                                                ipo.localidad_barrio_list = itemValue;
                                                this.setState({ ipo_actual: ipo });
                                            }
                                            }>
                                            {this.generarDesplegable('LOC_BOG')}
                                        </Picker>
                                        : <Text style={{ fontWeight: 'bold' }}>{tags.etiquetas.no_aplica}</Text>
                                }
                                <Text>{tags.etiquetas.ipo_hospital_cercano}</Text>
                                <Input value={this.state.ipo_actual.hospital_cercano}
                                    onChangeText={(value) => {
                                        let ipo = { ...this.state.ipo_actual };
                                        ipo.hospital_cercano = value;
                                        this.setState({ ipo_actual: ipo });
                                    }
                                    } />
                                <View style={{ height: 10 }} />
                            </CollapseBody>
                        </Collapse>
                        <Collapse isCollapsed={this.state.sectionsCollapsed}>
                            <CollapseHeader style={styles.collapsibleHeader}>
                                <View>
                                    <Text style={styles.collapsibleHeaderText}>{tags.etiquetas.ipo_header_two}</Text>
                                </View>
                            </CollapseHeader>
                            <CollapseBody pointerEvents={this.state.supervisor ? 'none' : 'auto'}>
                                <Text>{tags.etiquetas.ipo_nivel_tension}</Text>
                                <Picker selectedValue={this.state.ipo_actual.nivel_tension}
                                    onValueChange={(itemValue) => {
                                        let ipo = { ...this.state.ipo_actual };
                                        ipo.nivel_tension = itemValue;
                                        this.setState({ ipo_actual: ipo });
                                    }
                                    }>
                                    {this.generarDesplegable('NIVE_TENS')}
                                </Picker>
                                <Text>{tags.etiquetas.ipo_tipo_trabajo}</Text>
                                <Picker selectedValue={this.state.ipo_actual.tipo_trabajo}
                                    onValueChange={(itemValue) => {
                                        let ipo = { ...this.state.ipo_actual };
                                        ipo.tipo_trabajo = itemValue;
                                        this.setState({ ipo_actual: ipo });
                                    }
                                    }>
                                    {this.generarDesplegable('TIPO_TRAB')}
                                </Picker>
                                <Text>{tags.etiquetas.ipo_tipo_red}</Text>
                                <Picker selectedValue={this.state.ipo_actual.tipo_red}
                                    onValueChange={(itemValue) => {
                                        let ipo = { ...this.state.ipo_actual };
                                        ipo.tipo_red = itemValue;
                                        this.setState({ ipo_actual: ipo });
                                    }
                                    }>
                                    {this.generarDesplegable('TIPO_RED')}
                                </Picker>
                                <Text>{tags.etiquetas.ipo_tipo_subestacion}</Text>
                                <Picker selectedValue={this.state.ipo_actual.tipo_subestacion}
                                    onValueChange={(itemValue) => {
                                        let ipo = { ...this.state.ipo_actual };
                                        ipo.tipo_subestacion = itemValue;
                                        this.setState({ ipo_actual: ipo });
                                    }
                                    }>
                                    {this.generarDesplegable('TIPO_SUBE')}
                                </Picker>
                                <Text>{tags.etiquetas.ipo_datos_infraestructura}</Text>
                                <Picker selectedValue={this.state.ipo_actual.datos_infraestructura_cd}
                                    onValueChange={(itemValue) => {
                                        let ipo = { ...this.state.ipo_actual };
                                        ipo.datos_infraestructura_cd = itemValue;
                                        this.setState({ ipo_actual: ipo });
                                    }
                                    }>
                                    {this.generarDesplegable('INFA_ESTR')}
                                </Picker>
                                <Text>{tags.etiquetas.ipo_circuito}</Text>
                                <Text style={{ fontWeight: 'bold' }}>{this.state.ipo_actual.datos_infraestructura_circuito}</Text>
                                <Text>{tags.etiquetas.ipo_numero_apoyo}</Text>
                                <Input value={this.state.ipo_actual.datos_infraestructura_numero_apoyo}
                                    onChangeText={(value) => {
                                        let ipo = { ...this.state.ipo_actual };
                                        ipo.datos_infraestructura_numero_apoyo = value;
                                        this.setState({ ipo_actual: ipo });
                                    }
                                    } />
                                <Text>{tags.etiquetas.ipo_trabajo_lineas}</Text>
                                <Picker selectedValue={this.state.ipo_actual.trabajos_lines}
                                    onValueChange={(itemValue) => {
                                        let ipo = { ...this.state.ipo_actual };
                                        ipo.trabajos_lines = itemValue;
                                        this.setState({ ipo_actual: ipo });
                                    }}>
                                    {this.generarDesplegable('TRAB_LINE')}
                                </Picker>
                                <Text>{tags.etiquetas.ipo_zona}</Text>
                                <Picker selectedValue={this.state.ipo_actual.zona}
                                    onValueChange={(itemValue) => {
                                        let ipo = { ...this.state.ipo_actual };
                                        ipo.zona = itemValue;
                                        this.setState({ ipo_actual: ipo });
                                    }
                                    }>
                                    {this.generarDesplegable('ZONA')}
                                </Picker>
                                <Text>{tags.etiquetas.ipo_numero_proceso_inst}</Text>
                                <Text style={{ fontWeight: 'bold' }}>{tags.etiquetas.ipo_numero_proceso_inst_dato}</Text>
                                <View style={{ height: 10 }} />
                            </CollapseBody>
                        </Collapse>
                        <Collapse isCollapsed={this.state.sectionsCollapsed}>
                            <CollapseHeader style={styles.collapsibleHeader}>
                                <View>
                                    <Text style={styles.collapsibleHeaderText}>{tags.etiquetas.ipo_header_three}</Text>
                                </View>
                            </CollapseHeader>
                            <CollapseBody pointerEvents={this.state.supervisor ? 'none' : 'auto'}>
                                <Text>{tags.etiquetas.ipo_responsabilidad_ejecucion}</Text>
                                <Picker selectedValue={this.state.ipo_actual.responsabilidad_de_la_ejecucion_de_trabajos}
                                    onValueChange={(itemValue) => {
                                        let ipo = { ...this.state.ipo_actual };
                                        ipo.responsabilidad_de_la_ejecucion_de_trabajos = itemValue;
                                        if (itemValue == 'DESC_GO') {
                                            ipo.numero_resposabilidad_ejecucion_de_trabajos = this.state.data[this.state.currentDataIndex].orden_servicio.descargo;
                                        } else if (itemValue == 'ORDN_TRAB') {
                                            ipo.numero_resposabilidad_ejecucion_de_trabajos = this.state.data[this.state.currentDataIndex].orden_servicio.gom;
                                        }
                                        this.setState({ ipo_actual: ipo });
                                    }
                                    }>
                                    {this.generarDesplegable('RESP_ORDEN')}
                                </Picker>
                                <Input value={this.state.ipo_actual.numero_resposabilidad_ejecucion_de_trabajos}
                                    onChangeText={(value) => {
                                        let ipo = { ...this.state.ipo_actual };
                                        ipo.numero_resposabilidad_ejecucion_de_trabajos = value;
                                        this.setState({ ipo_actual: ipo });
                                    }} />
                                <Text>{tags.etiquetas.ipo_tipo_grupo_resp}</Text>
                                <Text style={{ fontWeight: 'bold' }}>{this.state.ipo_actual.tipo_grupo_tecnico}</Text>
                                <Text>{tags.etiquetas.ipo_movil}</Text>
                                <Text style={{ fontWeight: 'bold' }}>{this.state.ipo_actual.movil}</Text>
                                <Text>{tags.etiquetas.ipo_placa}</Text>
                                <Text style={{ fontWeight: 'bold' }}>{this.state.ipo_actual.placa}</Text>
                                <View style={{ flexDirection: 'row' }}>
                                    <CheckBox
                                        value={this.state.ipo_actual.insp_pre_vehiculo}
                                        onValueChange={() => {
                                            let ipo = { ...this.state.ipo_actual };
                                            ipo.insp_pre_vehiculo = !ipo.insp_pre_vehiculo;
                                            this.setState({ ipo_actual: ipo });
                                        }}
                                    />
                                    <Text style={{ marginTop: 5 }}>{tags.etiquetas.ipo_insp_pre_veh}</Text>
                                </View>
                                <Text>{tags.etiquetas.ipo_fecha_ejecucion}</Text>
                                <Button title={this.state.ipo_actual.fecha_ejecucion != null ? this.state.ipo_actual.fecha_ejecucion : response.fecha_programacion}
                                    onPress={() => this.abrirFechaEjecucion()} />
                                <View style={{ height: 10 }} />
                            </CollapseBody>
                        </Collapse>
                        <Collapse isCollapsed={this.state.sectionsCollapsed}>
                            <CollapseHeader style={styles.collapsibleHeader}>
                                <View>
                                    <Text style={styles.collapsibleHeaderText}>{tags.etiquetas.ipo_header_four}</Text>
                                </View>
                            </CollapseHeader>
                            <CollapseBody pointerEvents={this.state.supervisor ? 'none' : 'auto'}>
                                <View style={styles.riesgosDesc}>
                                    <Text style={{ color: 'white' }}>{tags.etiquetas.ipo_intro_riesgos}</Text>
                                </View>
                                {grupoRiesgoJson != null && listaRiesgosJson != null ?
                                    grupoRiesgoJson.map((grupo, i) => {
                                        if (grupo.numero != 0) {
                                            let interno = listaRiesgosJson.map((riesgo, j) => {
                                                if (grupo.llave == riesgo.llave_grupo) {
                                                    return <View key={j}>
                                                        <Text>{riesgo.numero} - {riesgo.nombre}</Text>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                            <View style={{ flexDirection: 'row' }}>
                                                                <CheckBox value={this.obtenerRiesgoPorLlave(riesgo.llave, 'PRE')}
                                                                    onValueChange={() => {
                                                                        this.cambiarValorRiesgo(riesgo.llave, 'PRE', '');
                                                                    }}
                                                                />
                                                                <Text style={{ marginTop: 5 }}>{tags.etiquetas.ipo_prev}</Text>
                                                            </View>
                                                            <View style={{ flexDirection: 'row', paddingRight: 20 }}>
                                                                <CheckBox value={this.obtenerRiesgoPorLlave(riesgo.llave, 'EJEC')}
                                                                    onValueChange={() => {
                                                                        this.cambiarValorRiesgo(riesgo.llave, 'EJEC', '');
                                                                    }}
                                                                />
                                                                <Text style={{ marginTop: 5 }}>{tags.etiquetas.ipo_ejec}</Text>
                                                            </View>
                                                        </View>
                                                        <Input placeholder={tags.etiquetas.ipo_medidas_control}
                                                            value={this.obtenerRiesgoPorLlave(riesgo.llave, 'MEDIDA')}
                                                            onChangeText={(value) => {
                                                                this.cambiarValorRiesgo(riesgo.llave, 'MEDIDA', value);
                                                            }} />
                                                    </View>
                                                }
                                            });
                                            return <View key={i}>
                                                <Text style={styles.tituloRiesgos}>{grupo.llave}. {grupo.nombre}</Text>
                                                <View style={styles.separator} />
                                                {interno}
                                            </View>
                                        }
                                    })
                                    : <Text>-</Text>
                                }
                                {grupoRiesgoJson != null && listaRiesgosJson != null ?
                                    grupoRiesgoJson.map((grupo, i) => {
                                        if (grupo.numero == 0) {
                                            let interno = listaRiesgosJson.map((riesgo, j) => {
                                                if (grupo.llave == riesgo.llave_grupo) {
                                                    return <View key={j}>
                                                        <Text>{riesgo.numero} - {riesgo.nombre}</Text>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                            <View style={{ flexDirection: 'row' }}>
                                                                <CheckBox value={this.obtenerRiesgoPorLlave(riesgo.llave, 'PRE')}
                                                                    onValueChange={() => {
                                                                        this.cambiarValorRiesgo(riesgo.llave, 'PRE', '');
                                                                    }}
                                                                />
                                                                <Text style={{ marginTop: 5 }}>{tags.etiquetas.ipo_prev}</Text>
                                                            </View>
                                                            <View style={{ flexDirection: 'row' }}>
                                                                <CheckBox value={this.obtenerRiesgoPorLlave(riesgo.llave, 'PRE')}
                                                                    onValueChange={() => {
                                                                        this.cambiarValorRiesgo(riesgo.llave, 'PRE', '');
                                                                    }}
                                                                />
                                                                <Text style={{ marginTop: 5 }}>{tags.etiquetas.ipo_ejec}</Text>
                                                            </View>
                                                        </View>
                                                        <Input placeholder={tags.etiquetas.ipo_medidas_control} />
                                                    </View>
                                                }
                                            });
                                            return <View key={i}>
                                                <Text style={styles.tituloRiesgos}>{grupo.llave}. {grupo.nombre}</Text>
                                                <View style={styles.separator} />
                                                {interno}
                                            </View>
                                        }
                                    })
                                    : <Text>-</Text>
                                }
                            </CollapseBody>
                        </Collapse>
                        <Collapse isCollapsed={false}>
                            <CollapseHeader style={styles.collapsibleHeader}>
                                <View>
                                    <Text style={styles.collapsibleHeaderText}>this.state</Text>
                                </View>
                            </CollapseHeader>
                            <CollapseBody pointerEvents={this.state.supervisor ? 'none' : 'auto'}>
                                <Text>{JSON.stringify(this.state.data)}</Text>
                            </CollapseBody>
                        </Collapse>
                    </View>
                </ScrollView>
                {
                    this.state.botonGuardarVisible ? (
                        <View style={styles.saveButton}>
                            <TouchableOpacity onPress={() => this.save()}>
                                <Icon name="save" size={30} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
            </KeyboardAvoidingView >
            /*
            <Text>{JSON.stringify(this.state)}</Text>*/
        );
    }
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    collapsibleHeader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#002A7C',
        borderBottomWidth: 1,
        borderBottomColor: '#007FFF',
    },
    collapsibleHeaderText: {
        color: '#FFFFFF',
        fontSize: 12,
    },
    saveButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        paddingTop: 5,
        paddingBottom: 5,
        paddingLeft: 5,
        paddingRight: 5,
        backgroundColor: '#007FFF',
        borderRadius: 10,
    },
    riesgosDesc: {
        backgroundColor: 'gray',
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    separator: {
        borderBottomColor: '#474747',
        borderBottomWidth: 1,
    },
    tituloRiesgos: {
        color: '#474747',
        fontWeight: 'bold'
    }
})

export default withNavigation(Ipo);