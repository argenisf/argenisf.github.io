var eventGraph;
var theTable = $('table.table-standard');
var tableTransacciones = $('#tableTransacciones');

function runAnalytics(){
	MP.api.setCredentials(GlobalAuth.authKeys.api_key, GlobalAuth.authKeys.api_secret);
	loadMainChart();
}

function loadMainChart(){
	doJQLQuery();
}

function fillTable(data){
	var baseRow = $('#baseRow'),
		baseRowHTML = '';
	if(theTable.length > 0 && data.length > 0 && baseRow.length > 0){
		baseRowHTML = baseRow.html();

		var newRows = '';
		var curRow = '';
		var categorias = [];
		var curCat = '';
		var curObj;

		//set the basic data
		for (var i = 0; i < data.length; i++){

			curObj =  data[i];
			curObj['remanente'] = ((curObj['presupuesto']-curObj['gasto'])>=0)?(curObj['presupuesto']-curObj['gasto']).toFixed(2):0.00;
			curObj['porcentaje'] = (curObj['presupuesto']>0)?(curObj['gasto']/curObj['presupuesto']*100).toFixed(0):0;

			curCat = curObj.cat.replace(" ","");
			curCat = curCat.replace(" ","");
			curCat = curCat.replace(" ","");
			if(!categorias.includes(curCat)){
				categorias.push(curCat);
			}

			curRow = '<tr class="table-standard-row '+curCat+'">'+baseRowHTML+'</tr>';

			//replace values
			curRow = curRow.replace('RemplazarCategoria',curObj.sub_cat);
			curRow = curRow.replace('RemplazarPorcentaje',curObj.porcentaje);
			curRow = curRow.replace('RemplazarPorcentaje',curObj.porcentaje);
			curRow = curRow.replace('RemplazarPorcentaje',curObj.porcentaje);
			curRow = curRow.replace('RemplazarPresupuesto',curObj.presupuesto);
			curRow = curRow.replace('RemplazarGasto',curObj.gasto);
			curRow = curRow.replace('RemplazarGasto',curObj.gasto);
			curRow = curRow.replace('RemplazarRemanente',curObj.remanente);
			curRow = curRow.replace('RemplazarSubCat',curObj.sub_cat);

			newRows+= curRow;
		}

		theTable.find('tbody').append(newRows);
		addTableBehavior(categorias);

	}
}//end of fillTable function

function addTableBehavior(categorias){

	//hide/unhide anchors
	var theAnchors = theTable.find('a.verDetalle');

	theAnchors.click(function(e){
		e.preventDefault();
		var thisAnchor = $(this);
		var theUL = thisAnchor.parent().parent().find('ul.table-detalles-interno');
		if(theUL.hasClass('hidden')){
			theUL.removeClass('hidden');
		}else{
			theUL.addClass('hidden');
		}
	});

	var aTransacciones = theTable.find('a.ver-transacciones');

	aTransacciones.click(function(e){
		var thisAnchor = $(this);
		if(thisAnchor.data('subcat')){
			buscarTransacciones(thisAnchor.data('subcat'));
		}
	});

	var optDiv = $('#OpcionesCategorias');
	var theItems = [{label: '-- Todas --', value: ''}];
	for(var i = 0; i < categorias.length; i++){
		theItems.push({label: categorias[i], value: categorias[i]});
	}
	optDiv.MPSelect({items: theItems});
	optDiv.on('change', function(e, selection) {
        verCategoria(selection);
    });

}// end of function addTableBehavior

function verCategoria(nombre){
	if(nombre === ""){
		theTable.find('.table-standard-row').removeClass('hidden');
	}else{
		theTable.find('.table-standard-row').addClass('hidden');
		theTable.find('.table-standard-row.'+nombre).removeClass('hidden');
	}
}

function doJQLQuery(){
	MP.api.jql(
	    function main() {
		  var today = new Date().toISOString().substr(0,10),
		    firstDayOfTheMonth = (today.substr(0,7)+'-01');
		    
		  return Events({
		    from_date: firstDayOfTheMonth,
		    to_date:   today,
		    event_selectors:[{event: 'Transaccion', selector: '(properties["tipo"] == "Gasto" or properties["tipo"] == "Presupuesto Gasto") and properties["categoria"] != "Ahorro" and properties["sub_categoria"] != "Alquiler"'}]
		  })
		  .groupBy(['properties.categoria','properties.sub_categoria'],function(acc, events){
		    var retObj = {presupuesto: 0, gasto: 0};
		    
		    _.each(events,function(e){
		      if(e.properties.tipo === 'Gasto'){
		        retObj.gasto = retObj.gasto + e.properties.monto;
		      }else{
		        retObj.presupuesto = retObj.gasto + e.properties.monto;
		      }
		    });
		    
		    _.each(acc,function(a){
		      retObj.gasto = retObj.gasto + a.gasto;
		      retObj.presupuesto = retObj.presupuesto + a.presupuesto;
		    });
		    
		    return retObj;
		  })
		  .sortAsc('key.0')
		  .map(function(o){
		    return {
		      cat: o.key[0],
		      sub_cat: o.key[1],
		      presupuesto: o.value.presupuesto.toFixed(2),
		      gasto: o.value.gasto.toFixed(2)
		    };
		  });
		}
	).done(function(results) {
	    fillTable(results);
	});
}

function buscarTransacciones(nombre){
	MP.api.jql(
	    function main() {
		  var today = new Date().toISOString().substr(0,10),
		    firstDayOfTheMonth = (today.substr(0,7)+'-01');
		    
		  return Events({
		    from_date: firstDayOfTheMonth,
		    to_date:   today,
		    event_selectors:[{event: 'Transaccion', selector: 'properties["tipo"] == "Gasto" and properties["sub_categoria"] == "'+params.sub_cat+'"'}]
		  })
		  .sortDesc('time')
		  .map(function(e){
		    var laFecha = new Date(e.time).toISOString().substr(5,5).split('-');
		    return {
		      fecha: ((laFecha.length > 1)?laFecha[1]+'/'+laFecha[0]:laFecha),
		      desc: e.properties.descripcion,
		      monto: e.properties.monto.toFixed(2)
		    };
		  });
		},{sub_cat: nombre}
	).done(function(results) {
	    loadTransacciones(nombre,results);
	});
}



function loadTransacciones(nombre, items){
	var tbody = tableTransacciones.find('tbody');
	tbody.html('');
	//remplazar titulo
	tableTransacciones.parent().find('h3 span').html(nombre);

	var theText = '';
	for(var i=0; i < items.length; i++){

		theText+= '<tr>';
		theText+= '<td>'+items[i].fecha+'</td>';
		theText+= '<td>'+items[i].desc+'</td>';
		theText+= '<td style="text-align: right;">€'+items[i].monto+'</td>';
		theText+= '</tr>';

	}
	tbody.html(theText);
}
