const COMMON_EXPENSES = {
    //comida
    "carref las gloria": {score: 1, category: 'mercado'},
    "mercadona": {score: 1, category: 'mercado'},
    "supermercat": {score: 7, category: 'mercado'},
    "condis": {score: 7, category: 'mercado'},
    "supermercado": {score: 7, category: 'mercado'},
    "supercor": {score: 7, category: 'mercado'},
    //transporte
    "taxis": {score: 0.7, category: 'transporte'},
    "taxi l": {score: 1, category: 'transporte'},
    "freenow": {score: 1, category: 'transporte'},
    "cabify es": {score: 1, category: 'transporte'},
    "renfe cercanias": {score: 1, category: 'transporte'},
    "t mobilitat  app": {score: 1, category: 'transporte'},
    //cuidado personal
    "farmacia": {score: 8, category: "cuidado_personal"},
    //servicios
    "orange espagne": {score: 1, category: "piso_servicios"},
    "uber    eats": {score: 0.8, category: 'comida_salidas'},
    "uber eats": {score: 0.8, category: 'comida_salidas'},
};

//returns a new array sorted descendingly by score
function sort_by_score_descending(arr) {
    return arr.slice().sort((a, b) => b.score - a.score);
}

function convert_object_to_array(obj){
    var arr = [];
    Object.keys(obj).forEach(function(key){
        arr.push(obj[key]);
    })
    return arr;
}

function get_suggestions(transaction){
    var suggestions = [];
    if('category' in transaction && transaction.category != '') return suggestions;
    var sug_obj = {};
    const search_term = transaction.description.toLowerCase();
    var amount = transaction.amount;
    if(amount < 0) amount = amount * -1;

    if(search_term.includes('Freenow')){
        console.log('free')
    }

    //review suggestions based on the description
    if('description' in transaction && transaction.description!= ''){
        Object.keys(COMMON_EXPENSES).forEach(function(expense){
            if(search_term.includes(expense)){
                if(!(expense in sug_obj) || COMMON_EXPENSES[expense].score > sug_obj[expense]?.score){
                    sug_obj[expense] = {
                        score: COMMON_EXPENSES[expense].score,
                        category: COMMON_EXPENSES[expense].category,
                        description: '',
                        source: 'common:0',
                        amount:0
                    };
                }
            }
        });
    }//review suggestions based on the description

    //review recurring expenses
    recurring_t.forEach(function(rec, i){
        //check for amount and description
        var diff = rec.amount - amount;
        if(diff < 0) diff = diff*-1;
        const percentage  = diff/amount;
        var score = 0;
        if(percentage < 0.02){
            score = 0.6;
        }else if(percentage <= 0.05){
            score = 0.5;
        }

        if(search_term.includes(rec.description.toLowerCase())){
            score+= 0.4;
        }

        if((score >= 0.5) && (!(rec.category in sug_obj) || score > sug_obj[rec.category]?.score)){
            sug_obj[rec.category] = {
                score,
                category: rec.category,
                description: '',
                source: `recurring:${rec.reference}`,
                amount: rec.amount
            };
        }
    });
    //review recurring expenses

    //review pending expenses
    pending_t.forEach(function(pen, i){
        //check for amount and time
        var diff = pen.amount - amount;
        if(diff < 0) diff = diff*-1;
        const percentage  = diff/amount;
        var score = 0;
        if((amount < 20 && percentage < 0.03) || (amount >= 20 && percentage < 0.03)){
            score = 0.6;
        }else if((amount < 20 && percentage < 0.05) || (amount >= 20 && percentage < 0.08)){
            score = 0.5;
        }

        //check how close the day is
        var time_diff = pen.time - transaction.time;
        if(time_diff < 0) time_diff = time_diff * -1;
        
        if(time_diff < DAY_IN_SECONDS){
            score+= 0.4;
        }else if(time_diff < (DAY_IN_SECONDS*3)){
            score+= 0.2;
        }

        if((score >= 0.5) && (!(pen.category in sug_obj) || score > sug_obj[pen.category]?.score)){
            sug_obj[pen.category] = {
                score,
                category: pen.category,
                description: pen.description,
                source: `pending:${pen.reference}`,
                amount: pen.amount
            };
        }
    });
    //review pending expenses

    suggestions = sort_by_score_descending(convert_object_to_array(sug_obj));
    return suggestions;
}//end of get_suggestions