(function () {

    var visInstance;

    function loadCreditVisWidget(ele) {
        var result = creditData();
        
        return VIS.CHART.WIDGET.creditVisWidget({
            element: ele[0],
            data: result
        });
    }


    $(document).ready(function () {
        visInstance = loadCreditVisWidget($('[data-id="graph-Widget"]'));
        $('#topFisheyeBtn').click(function(){
            visInstance.toggleTopXFisheye();
        });
        $('#bottomFisheyeBtn').click(function(){
            visInstance.toggleBottomXFisheye();
        });        
    });
})();