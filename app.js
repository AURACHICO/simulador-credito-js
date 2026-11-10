"use strict";

const FILAS_VISIBLES = 6;
const $ = (id) => document.getElementById(id);
const pesos = (valor) => "$ " + Math.round(valor).toLocaleString("es-CO");

let verTodas = false;
let cuotas = [];

/**
 * Calcula la tabla de amortización.
 * - "fija": sistema francés, la cuota es igual todos los meses.
 * - "capital": sistema alemán, el abono a capital es igual y la cuota baja mes a mes.
 */
function calcularCuotas(monto, tasaMensual, plazo, sistema) {
  const filas = [];
  const cuotaFija = tasaMensual === 0
    ? monto / plazo
    : (monto * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -plazo));
  let saldo = monto;

  for (let numero = 1; numero <= plazo; numero++) {
    const interes = saldo * tasaMensual;
    const capital = sistema === "fija" ? cuotaFija - interes : monto / plazo;
    saldo = Math.max(0, saldo - capital);
    filas.push({ numero, cuota: capital + interes, interes, capital, saldo });
  }
  return filas;
}

function leerFormulario() {
  const monto = parseFloat($("monto").value);
  const tasa = parseFloat($("tasa").value);
  const plazo = parseInt($("plazo").value, 10);
  const sistema = $("sistema").value;

  if (!(monto > 0)) return { error: "Ingresa un monto mayor que cero." };
  if (Number.isNaN(tasa) || tasa < 0) return { error: "Ingresa una tasa válida (0 o más)." };
  return { monto, tasaMensual: tasa / 100, plazo, sistema };
}

function pintarResumen(datos) {
  const totalInteres = cuotas.reduce((suma, fila) => suma + fila.interes, 0);
  const tasaAnual = (Math.pow(1 + datos.tasaMensual, 12) - 1) * 100;

  $("kpi-cuota-label").textContent = datos.sistema === "fija" ? "Cuota mensual" : "Primera cuota";
  $("kpi-cuota").textContent = pesos(cuotas[0].cuota);
  $("kpi-interes").textContent = pesos(totalInteres);
  $("kpi-total").textContent = pesos(datos.monto + totalInteres);
  $("tasa-anual").textContent = tasaAnual.toFixed(2).replace(".", ",") + " %";
  $("plazo-texto").textContent = datos.plazo;
}

function pintarGrafico() {
  const ANCHO = 600, ALTO = 150;
  const maximo = Math.max(...cuotas.map((fila) => fila.cuota));
  const paso = ANCHO / cuotas.length;

  $("grafico").innerHTML = cuotas.map((fila, i) => {
    const altoCapital = (fila.capital / maximo) * (ALTO - 6);
    const altoInteres = (fila.interes / maximo) * (ALTO - 6);
    const x = (i * paso + paso * 0.12).toFixed(1);
    const ancho = (paso * 0.76).toFixed(1);
    return `<rect x="${x}" y="${(ALTO - altoCapital).toFixed(1)}" width="${ancho}" height="${altoCapital.toFixed(1)}" fill="#0f9d6e"><title>Cuota ${fila.numero}: capital ${pesos(fila.capital)}</title></rect>` +
           `<rect x="${x}" y="${(ALTO - altoCapital - altoInteres).toFixed(1)}" width="${ancho}" height="${altoInteres.toFixed(1)}" fill="#f59e0b"><title>Cuota ${fila.numero}: interés ${pesos(fila.interes)}</title></rect>`;
  }).join("");
}

function pintarTabla() {
  const visibles = verTodas ? cuotas : cuotas.slice(0, FILAS_VISIBLES);
  let html = visibles.map((fila) =>
    `<tr><td>${fila.numero}</td><td>${pesos(fila.cuota)}</td><td>${pesos(fila.interes)}</td><td>${pesos(fila.capital)}</td><td>${pesos(fila.saldo)}</td></tr>`
  ).join("");

  const ocultas = cuotas.length - visibles.length;
  if (ocultas > 0) html += `<tr><td class="mas" colspan="5">… ${ocultas} cuotas más</td></tr>`;

  $("filas").innerHTML = html;
  $("ver-todas").textContent = verTodas ? "Ver menos" : "Ver todas las cuotas";
  $("ver-todas").hidden = cuotas.length <= FILAS_VISIBLES;
}

function simular() {
  const datos = leerFormulario();
  if (datos.error) {
    $("error").textContent = datos.error;
    return;
  }
  $("error").textContent = "";
  cuotas = calcularCuotas(datos.monto, datos.tasaMensual, datos.plazo, datos.sistema);
  pintarResumen(datos);
  pintarGrafico();
  pintarTabla();
}

/** Descarga la tabla como CSV con separador ";" para que Excel en español la abra en columnas. */
function exportar() {
  if (!cuotas.length) return;
  const lineas = [["Cuota", "Valor cuota", "Interés", "Abono a capital", "Saldo"].join(";")];
  cuotas.forEach((fila) => {
    lineas.push([fila.numero, fila.cuota, fila.interes, fila.capital, fila.saldo]
      .map((valor, i) => (i === 0 ? valor : Math.round(valor)))
      .join(";"));
  });
  const archivo = new Blob(["﻿" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = "tabla-amortizacion.csv";
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

$("monto-rango").addEventListener("input", (e) => { $("monto").value = e.target.value; simular(); });
$("monto").addEventListener("input", (e) => { $("monto-rango").value = e.target.value; simular(); });
["tasa", "plazo", "sistema"].forEach((id) => $(id).addEventListener("input", simular));
$("ver-todas").addEventListener("click", () => { verTodas = !verTodas; pintarTabla(); });
$("exportar").addEventListener("click", exportar);

simular();
