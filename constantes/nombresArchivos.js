import { FileSystem } from 'expo';
export const archivos = {
    valorListadosUri: FileSystem.documentDirectory + 'valor_listados.json',
    grupoRiesgoUri: FileSystem.documentDirectory + 'grupo_riesgo.json',
    riesgoSeguridadUri: FileSystem.documentDirectory + 'riesgo_seguridad.json',
    cuadrillasUri: FileSystem.documentDirectory + 'cuadrillas.json',
    picturesUri: FileSystem.documentDirectory + 'pictures.json',
    picturesFolderUri: FileSystem.documentDirectory + 'pictures_rg',
}