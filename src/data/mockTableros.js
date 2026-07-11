export const initialTablerosData = {
  "11": {
    id: "11",
    ubicacion: "RECEPCIÓN SOTANO( SALA DE ESPERA)",
    alimentadoPor: "INTERRUPTOR 3X70 EATON UBICADO DENTRO DE LA TRANSFERENCIA 160.",
    tipo: "empotrado",
    barrasPrincipales: {
      ia: "4",
      ib: "18,5",
      ic: "14"
    },
    breakerPrincipal: {
      marca: "N/A",
      tipo: "",
      amp: "N/A"
    },
    voltaje: {
      va: "208",
      vb: "205",
      vc: "205"
    },
    acometida: "3X 3/0",
    maxPoles: 30,
    circuits: [
      // Left side (odd poles)
      { id: "c11_l1", side: "left", poles: [1], equipo: "RESERVA", breaker: { marca: "", tipo: "", amp: "" }, conductor: "" },
      { id: "c11_l3", side: "left", poles: [3], equipo: "ALUMBRADO TOMOGRAFIA", breaker: { marca: "", tipo: "TQ", amp: "20" }, conductor: "2X12" },
      { id: "c11_l5", side: "left", poles: [5], equipo: "RESERVA", breaker: { marca: "", tipo: "TQ", amp: "20" }, conductor: "" },
      { id: "c11_l7", side: "left", poles: [7], equipo: "T/C ECOSONOGRAMA", breaker: { marca: "", tipo: "TQ", amp: "30" }, conductor: "12" },
      { id: "c11_l9", side: "left", poles: [9], equipo: "T/C RAYOS X", breaker: { marca: "", tipo: "TQ", amp: "20" }, conductor: "12" },
      { id: "c11_l11", side: "left", poles: [11], equipo: "ALUM. ESTACIONAMIENTO", breaker: { marca: "", tipo: "TQ", amp: "20" }, conductor: "12" },
      { id: "c11_l13", side: "left", poles: [13], equipo: "", breaker: { marca: "", tipo: "TQ", amp: "20" }, conductor: "12" },
      { id: "c11_l15", side: "left", poles: [15], equipo: "", breaker: { marca: "", tipo: "TQ", amp: "20" }, conductor: "12" },
      { id: "c11_l17_19", side: "left", poles: [17, 19], equipo: "A/A FARMACIA", breaker: { marca: "", tipo: "TQ", amp: "40" }, conductor: "10" },
      { id: "c11_l21_25", side: "left", poles: [21, 23, 25], equipo: "MAMOGRAFIA", breaker: { marca: "", tipo: "TQ", amp: "40" }, conductor: "8" },
      { id: "c11_l27", side: "left", poles: [27], equipo: "", breaker: { marca: "", tipo: "TQ", amp: "40" }, conductor: "8" },
      { id: "c11_l29", side: "left", poles: [29], equipo: "CALENTADOR LAB.", breaker: { marca: "", tipo: "TQ", amp: "30" }, conductor: "12" },

      // Right side (even poles)
      { id: "c11_r2", side: "right", poles: [2], equipo: "RESERVA", breaker: { marca: "", tipo: "", amp: "" }, conductor: "" },
      { id: "c11_r4", side: "right", poles: [4], equipo: "ALUMB. RX", breaker: { marca: "", tipo: "", amp: "" }, conductor: "12" },
      { id: "c11_r6", side: "right", poles: [6], equipo: "ALUMB PASILLO ESP", breaker: { marca: "", tipo: "", amp: "" }, conductor: "12" },
      { id: "c11_r8", side: "right", poles: [8], equipo: "T/C ECOSON/MAMOG", breaker: { marca: "", tipo: "", amp: "" }, conductor: "4X12" },
      { id: "c11_r10", side: "right", poles: [10], equipo: "T/C DIAGNOSTICO", breaker: { marca: "", tipo: "", amp: "" }, conductor: "12" },
      { id: "c11_r12", side: "right", poles: [12], equipo: "T/C FARMACIA", breaker: { marca: "", tipo: "", amp: "" }, conductor: "12" },
      { id: "c11_r14", side: "right", poles: [14], equipo: "RESERVA", breaker: { marca: "", tipo: "", amp: "" }, conductor: "" },
      { id: "c11_r16", side: "right", poles: [16], equipo: "", breaker: { marca: "", tipo: "", amp: "20" }, conductor: "12" },
      { id: "c11_r18", side: "right", poles: [18], equipo: "REFLECTOR FRENTE", breaker: { marca: "", tipo: "", amp: "" }, conductor: "10" },
      { id: "c11_r20", side: "right", poles: [20], equipo: "", breaker: { marca: "", tipo: "", amp: "" }, conductor: "10" },
      { id: "c11_r22", side: "right", poles: [22], equipo: "T/C TOMOGRAFO", breaker: { marca: "", tipo: "", amp: "20" }, conductor: "2X12" },
      { id: "c11_r24", side: "right", poles: [24], equipo: "220 REVELADO", breaker: { marca: "", tipo: "", amp: "" }, conductor: "10" },
      { id: "c11_r26", side: "right", poles: [26], equipo: "BANCO DE SANGRE", breaker: { marca: "", tipo: "", amp: "" }, conductor: "10" },
      { id: "c11_r28", side: "right", poles: [28], equipo: "", breaker: { marca: "", tipo: "", amp: "" }, conductor: "10" },
      { id: "c11_r30", side: "right", poles: [30], equipo: "", breaker: { marca: "", tipo: "", amp: "" }, conductor: "10" }
    ],
    neutroLlegada: {
      calibre: "2",
      observaciones: "CABLE ROJO EN TABLERO"
    },
    puestaTierra: {
      calibre: "2",
      observaciones: "CABLE BLANCO, SIN BARRA, CONECTADOS A UN CONECTOR KS"
    },
    observacionesGenerales: ""
  },
  "10": {
    id: "10",
    ubicacion: "IMÁGENES (ENTRADO POR SOTANO)",
    alimentadoPor: "VIENE DEL TABLERO 23 (13-15-17)",
    tipo: "empotrado",
    barrasPrincipales: {
      ia: "7",
      ib: "10",
      ic: "6"
    },
    breakerPrincipal: {
      marca: "60",
      tipo: "",
      amp: ""
    },
    voltaje: {
      va: "213",
      vb: "210",
      vc: "212"
    },
    acometida: "3X4 TW ROJO+NEGRO",
    maxPoles: 24,
    circuits: [
      // Left side (odd poles)
      { id: "c10_l1", side: "left", poles: [1], equipo: "RESERVA", breaker: { marca: "", tipo: "", amp: "20" }, conductor: "12" },
      { id: "c10_l3", side: "left", poles: [3], equipo: "CENTRAL DE INCEND", breaker: { marca: "", tipo: "", amp: "20" }, conductor: "12" },
      { id: "c10_l5", side: "left", poles: [5], equipo: "", breaker: { marca: "", tipo: "", amp: "20" }, conductor: "12" },
      { id: "c10_l7", side: "left", poles: [7], equipo: "", breaker: { marca: "", tipo: "", amp: "20" }, conductor: "10" },
      { id: "c10_l9", side: "left", poles: [9], equipo: "", breaker: { marca: "", tipo: "", amp: "30" }, conductor: "2X10" },
      { id: "c10_l11", side: "left", poles: [11], equipo: "", breaker: { marca: "", tipo: "", amp: "30" }, conductor: "10" },
      { id: "c10_l13", side: "left", poles: [13], equipo: "", breaker: { marca: "", tipo: "", amp: "30" }, conductor: "10" },
      { id: "c10_l15", side: "left", poles: [15], equipo: "", breaker: { marca: "", tipo: "", amp: "40" }, conductor: "12" },
      { id: "c10_l17_23", side: "left", poles: [17, 19, 21, 23], equipo: "ESPACIO DEL INTERRUPTOR PRINCIPAL", breaker: { marca: "", tipo: "", amp: "60" }, conductor: "4" },

      // Right side (even poles)
      { id: "c10_r2", side: "right", poles: [2], equipo: "", breaker: { marca: "", tipo: "", amp: "20" }, conductor: "12" },
      { id: "c10_r4", side: "right", poles: [4], equipo: "", breaker: { marca: "", tipo: "", amp: "20" }, conductor: "2X12" },
      { id: "c10_r6", side: "right", poles: [6], equipo: "CALENTADOR", breaker: { marca: "", tipo: "", amp: "20" }, conductor: "12" },
      { id: "c10_r8", side: "right", poles: [8], equipo: "", breaker: { marca: "", tipo: "", amp: "20" }, conductor: "12" },
      { id: "c10_r10", side: "right", poles: [10], equipo: "ALARMA", breaker: { marca: "", tipo: "", amp: "30" }, conductor: "10" },
      { id: "c10_r12", side: "right", poles: [12], equipo: "", breaker: { marca: "", tipo: "", amp: "30" }, conductor: "10" },
      { id: "c10_r14", side: "right", poles: [14], equipo: "PUERTA ELECTRICA", breaker: { marca: "", tipo: "", amp: "20" }, conductor: "10" },
      { id: "c10_r16", side: "right", poles: [16], equipo: "", breaker: { marca: "", tipo: "", amp: "" }, conductor: "10" },
      { id: "c10_r18", side: "right", poles: [18], equipo: "BANCO DE SANGRE", breaker: { marca: "", tipo: "", amp: "40" }, conductor: "10" },
      { id: "c10_r20", side: "right", poles: [20], equipo: "", breaker: { marca: "", tipo: "", amp: "" }, conductor: "10" },
      { id: "c10_r22", side: "right", poles: [22], equipo: "PUESTA ELEC ESTACION", breaker: { marca: "", tipo: "", amp: "20" }, conductor: "10" },
      { id: "c10_r24", side: "right", poles: [24], equipo: "", breaker: { marca: "", tipo: "", amp: "" }, conductor: "10" }
    ],
    neutroLlegada: {
      calibre: "8",
      observaciones: "BLANCO EN BARRA"
    },
    puestaTierra: {
      calibre: "8",
      observaciones: "CABLE NEGRO"
    },
    observacionesGenerales: ""
  },
  "20": {
    id: "20",
    ubicacion: "SOTANO SALA DE TABLEROS",
    alimentadoPor: "ATS SOTANO (TRANSFERENCIA AUTOMATICA) transferecia 580",
    tipo: "superficial",
    barrasPrincipales: {
      ia: "",
      ib: "",
      ic: ""
    },
    breakerPrincipal: {
      marca: "SIN",
      tipo: "BREAKER",
      amp: ""
    },
    voltaje: {
      va: "211,5",
      vb: "207,4",
      vc: "208,6"
    },
    acometida: "3X500 MCM",
    maxPoles: 30,
    circuits: [
      // Left side (odd poles)
      { id: "c20_l1_5", side: "left", poles: [1, 3, 5], equipo: "TAAP3 (TAB 38A)", breaker: { marca: "GE", tipo: "M35", amp: "150" }, conductor: "1/0" },
      { id: "c20_l7_11", side: "left", poles: [7, 9, 11], equipo: "TAAP2 (TAB 35)", breaker: { marca: "GE", tipo: "M35", amp: "175" }, conductor: "2/0" },
      { id: "c20_l13_17", side: "left", poles: [13, 15, 17], equipo: "TAAP1 (TAB 36)", breaker: { marca: "INESLA", tipo: "TQD", amp: "32" }, conductor: "3/0" },
      { id: "c20_l19_23", side: "left", poles: [19, 21, 23], equipo: "TA IMAG POSIBLEMENTE TAB 48)", breaker: { marca: "ABB", tipo: "A2C", amp: "250" }, conductor: "350" },
      { id: "c20_l25_29", side: "left", poles: [25, 27, 29], equipo: "TAPB", breaker: { marca: "MG", tipo: "NS", amp: "250" }, conductor: "4/0" },

      // Right side (even poles)
      { id: "c20_r2_6", side: "right", poles: [2, 4, 6], equipo: "A/A", breaker: { marca: "GE", tipo: "M35", amp: "175" }, conductor: "3X8 TW" },
      { id: "c20_r8_12", side: "right", poles: [8, 10, 12], equipo: "TABLERO RANCHO (TAB 46)", breaker: { marca: "GE", tipo: "M35", amp: "150" }, conductor: "350" },
      { id: "c20_r14_18", side: "right", poles: [14, 16, 18], equipo: "ASENSOR NUEVO", breaker: { marca: "GE", tipo: "TED32", amp: "100" }, conductor: "2" },
      { id: "c20_r20_24", side: "right", poles: [20, 22, 24], equipo: "LAVANDERIA (TAB 17)", breaker: { marca: "GE", tipo: "M51", amp: "125" }, conductor: "6" },
      { id: "c20_r26_30", side: "right", poles: [26, 28, 30], equipo: "TAA SOT (TAB 38)", breaker: { marca: "GE", tipo: "TM250", amp: "250" }, conductor: "250" }
    ],
    neutroLlegada: {
      calibre: "1X500",
      observaciones: ""
    },
    puestaTierra: {
      calibre: "SOLIDO # 4",
      observaciones: "LLEGA SOLIDO # 4. BUSCAR TANQUILLA DE MALLA A TIERRA"
    },
    observacionesGenerales: "SALEN ACOMETIDAS 1 X 500 Y 1X250 MCM DE LA BARRA PARTE INFERIOR. LA ACOMETIDA 250 MCM VA A CAJA CON UN BREAKER AL LADO DEL TABLERO PRINCIPAL. INTERRUPTOR EATON, Ki400, 350 A. SALEN UNA ACOMETIDA 4/0 QUE ALIMENTA TRANSFERENCIA 160 LA ACOMETIDA 500 MCM VA A UNA CAJA AL LADO DEL TABLERO PRINCIPAL. INTERRUPTOR ABB, TIPO 6520, 400 A, SALEN 2X500 Y ALIMENTAN TABLERO EN PRIMER PISO."
  }
};
