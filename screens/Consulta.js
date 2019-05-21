import React from 'react'
import {
    Text, View, Button, TouchableOpacity,
    StyleSheet, AsyncStorage, ToastAndroid,
    KeyboardAvoidingView
} from 'react-native'
import { Picker, DatePicker, Toast } from 'native-base'
import {
    Input,
} from 'react-native-elements'

import { FileSystem } from 'expo';

import Icon from 'react-native-vector-icons/FontAwesome';
import { ScrollView } from 'react-native-gesture-handler';

const tags = require('../constantes/etiquetas');
const procesos = require('../constantes/nombresProceso');
const DataHandler = require('./DataHandler');
const arch = require('../constantes/nombresArchivos')

const styles = StyleSheet.create({
    content: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        marginTop: 20,
        marginLeft: 10,
    },
    inputsContainer: {
        width: '80%',
        flexDirection: 'row',
    },
    buttons: {
        width: 40,
        alignItems: 'center',
    },
    labels: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 20,
    }
})

export default class Consulta extends React.Component {

    static navigationOptions = ({ navigation }) => {
        let isSupervisor = navigation.getParam('isSupervisor');
        return {
            title: 'Filtro de órdenes',
            headerLeft:
                <TouchableOpacity style={styles.buttons} onPress={isSupervisor ?
                    async () => {
                        await AsyncStorage.removeItem('contrasena').then(async () => {
                            await AsyncStorage.removeItem('numDoc').then(async () => {
                                await AsyncStorage.removeItem('user').then(() => {
                                    navigation.navigate('Login');
                                })
                            })
                        })
                    } :
                    () => { navigation.goBack() }
                }>
                    <Icon name="chevron-left" size={20} color="#fff" />
                </TouchableOpacity>,
            headerRight:
                isSupervisor ? <View></View> :
                    <TouchableOpacity style={styles.buttons} onPress={async () => {
                        await AsyncStorage.removeItem('contrasena').then(async () => {
                            await AsyncStorage.removeItem('numDoc').then(async () => {
                                await AsyncStorage.removeItem('user').then(() => {
                                    navigation.navigate('Login');
                                })
                            })
                        })
                    }}>
                        <Icon name="sign-out" size={20} color="#fff" />
                    </TouchableOpacity>
        }
    };

    constructor(props) {
        super(props);
        this.state = {
            gom: null,
            activo: null,
            fecha_registro: null,
            actividad: null,
            cuadrilla: null,
            descargo: null,
            listaCuadrillas: [],
        }
        this.consultar = this.consultar.bind(this);
    }

    async componentDidMount() {
        let fileUri = arch.archivos.cuadrillasUri;
        let promUri = DataHandler.traerValoresDeArchivo(fileUri)
        let cuadrillasArray = [];
        Promise.resolve(promUri).then((cuadrillas) => {
            let cuadrillasJson;
            try{
                cuadrillasJson = JSON.parse(cuadrillas);
            }catch(err){
                cuadrillasJson = cuadrillas;
            }
            cuadrillasJson.map((cdr, i) => {
                cuadrillasArray.push(<Picker.Item key={i} label={cdr.nombre} value={cdr._id} />)
            })
            this.setState({ listaCuadrillas: cuadrillasArray });
        })
    }

    async consultar() {
        let valido = false;
        let isSupervisor = this.props.navigation.getParam('isSupervisor');
        for (let key of Object.keys(this.state)) {
            if (key != 'listaCuadrillas'
                && this.state[key] != null
                && this.state[key] != '') {
                valido = true;
                break;
            }
        }
        if (valido) {
            let filtro = {};
            for (let key of Object.keys(this.state)) {
                if (key != 'listaCuadrillas'
                    && this.state[key] != null
                    && this.state[key] != '') {
                    filtro[key] = this.state[key];
                }
            }
            this.props.navigation.navigate('PestanasPrincipal',{filtros:filtro, isSupervisor:isSupervisor})
        } else if (isSupervisor) {
            ToastAndroid.show('Debe digitar algún criterio de búsqueda', ToastAndroid.SHORT)
        } else {
            this.props.navigation.navigate('PestanasPrincipal', {filtros:{}, isSupervisor:isSupervisor});
        }
    }

    render() {
        let isSupervisor = this.props.navigation.getParam('isSupervisor');
        return (
            <KeyboardAvoidingView style={styles.content} behavior="position">
                <ScrollView>
                    <View>
                        <Text style={styles.labels}>{tags.etiquetas.consulta_gom}</Text>
                    </View>
                    <View>
                        <Input value={this.state.gom}
                            keyboardType='phone-pad'
                            onChangeText={(value) => {
                                this.setState({ gom: value });
                            }
                            } />
                    </View>
                    <View>
                        <Text style={styles.labels}>{tags.etiquetas.consulta_proceso}</Text>
                    </View>
                    <View>
                        <Picker
                            mode="dropdown"
                            style={{ width: undefined }}
                            selectedValue={this.state.actividad}
                            onValueChange={(itemValue) => {
                                this.setState({ actividad: itemValue });
                            }}>
                            <Picker.Item key={-1} label={'-Seleccione-'} value={null} />
                            {
                                Object.keys(procesos.nombresProceso).map((valor, i) => {
                                    return <Picker.Item key={i} label={procesos.nombresProceso[valor]} value={procesos.nombresProceso[valor]} />
                                })}
                        </Picker>
                    </View>
                    {
                        this.state.actividad != null && this.state.actividad.includes('Levantamiento') ? <View><Text>{this.state.actividad}</Text></View> : <View></View>
                    }
                    {
                        isSupervisor ?
                            <View>
                                <View>
                                    <Text style={styles.labels}>{tags.etiquetas.consulta_fecha}</Text>
                                </View>
                                <View>
                                    <DatePicker placeHolderText="-Seleccione una fecha-"
                                        onDateChange={(date) => {
                                            this.setState({ fecha_registro: date });
                                        }}
                                    />
                                </View>
                                <View>
                                    <Text style={styles.labels}>{tags.etiquetas.consulta_cuadrilla}</Text>
                                </View>
                                <View>
                                    <Picker
                                        mode="dropdown"
                                        style={{ width: undefined }}
                                        selectedValue={this.state.cuadrilla}
                                        textStyle={{ color: "#5cb85c" }}
                                        onValueChange={(itemValue) => {
                                            this.setState({ cuadrilla: itemValue });
                                        }}>
                                        <Picker.Item key={-1} label={'-Seleccione-'} value={null} />
                                        {
                                            this.state.listaCuadrillas
                                        }
                                    </Picker>
                                </View>
                            </View>
                            :
                            <View>
                                <View>
                                    <Text style={styles.labels}>{tags.etiquetas.consulta_cd}</Text>
                                </View>
                                <View>
                                    <Input value={this.state.activo}
                                        onChangeText={(value) => {
                                            this.setState({ activo: value });
                                        }
                                        } />
                                </View>
                                <View>
                                    <Text style={styles.labels}>{tags.etiquetas.consulta_descargo}</Text>
                                </View>
                                <View>
                                    <Input value={this.state.descargo}
                                        keyboardType='phone-pad'
                                        onChangeText={(value) => {
                                            this.setState({ descargo: value });
                                        }
                                        } />
                                </View>
                                <View style={{ height: 20 }} />
                            </View>
                    }

                    <View>
                        <Button title={tags.etiquetas.consulta_buscar}
                            onPress={() => { this.consultar() }} />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        )
    }
}