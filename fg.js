const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function getImgArr(link){

    arr = [];

    filesq = $.ajax({
        url:link,
        accepts:"text",
        dataType:"text",
        type:"get",
        crossDomain:false,
        async: false
    }).responseText;

    $.each($(filesq).find(".file"), function(){
        imgurl = "https:"+$(this).children(".fileThumb").attr("href");
        content = $(this).siblings("blockquote").text();
        tmp = []
        tmp.push(imgurl);
        tmp.push(content);
        arr.push(tmp);
    });

    console.log(arr);

    return arr;
}

class Beatbar{
    constructor(JQbeatbarcanvas){
        this.canvas= JQbeatbarcanvas[0];
        this.context = this.canvas.getContext("2d");
        this.queue=[];
        this.stopflag=false;
        this.beatbartimelength = 2000;
        this.final_element_delay = 0;
        this.last_frame_time = Date.now();
    }
    addToQueue(num, delay){
        for(var i = 0; i<num;i++){
            if(this.final_element_delay < 0){
                this.final_element_delay = 0;
            }
            this.final_element_delay += delay;
            this.queue.push(this.final_element_delay);
        }
    }
    draw(){
        var this_frame_time;
        this_frame_time=Date.now();

        let width = this.canvas.width = $("canvas").width();
        let height = this.canvas.height = $("canvas").height();
        let deltat = this_frame_time-this.last_frame_time;
        var centerh = height/2;
        var centerw = width/2;
        this.context = this.canvas.getContext("2d");
        this.context.fillStyle = 'rgb(200, 50, 50)';

        var distance = 0;
        var i = 0;

        
        while(i<this.queue.length){
            this.queue[i] -= deltat;
            distance = this.queue[i];
            if(distance < -this.beatbartimelength - 10000){
                this.queue.splice(i,1);
                i++;
                continue;
            }
            if(distance < this.beatbartimelength){
                this.context.arc(centerw+centerw*(distance/this.beatbartimelength),centerh,0.4*height,0,2*Math.PI);
                this.context.fill();
            };
            i++;
            continue;
        }
        this.context.beginPath();
        this.context.moveTo(centerw,0);
        this.context.lineTo(centerw,height);
        this.context.stroke();
        this.final_element_delay-=deltat;
        this.last_frame_time = this_frame_time;
    
    }

}

class FgManager{
    static speeds = {//strokes per minute; adjust
        "very slow":20,
        "slow":40,
        "normal":60,
        "medium":60,
        "fast":100,
        "extreme fast":140,
        "extremely fast":140,
    }
    constructor(arr,img_selector,preload_selector, textjqobject, beatbar){
        this.img_selector = img_selector;
        this.preload_selector = preload_selector;
        this.textobj = textjqobject;
        this.beatbar = beatbar;
        this.dataarr = arr;
        this.stopflag=false;
        this.reexp = RegExp("([1-9]|[1-9][0-9]|1[0-9][0-9]), (very slow|slow|normal|medium|fast|very fast|extreme?ly fast), ([a-zA-Z0-9 ]+)");
        this.last_image_time = Date.now();
        this.iterator = -1;
        this.next_image_time = 0;

        this.queue_image();
        this.iterator++;
    }
    queue_image(){
        if(this.dataarr.length > this.iterator+1){
            $(this.preload_selector).attr("src",arr[this.iterator+1][0]);
            var data = this.reexp.exec(arr[this.iterator+1][1]);
            if(data != null){
                console.log(data);
                var count = data[1];
                var delay = 60000/FgManager.speeds[data[2]];
                this.beatbar.addToQueue(count,delay)
                this.next_text = data[3];
                this.next_next_time = delay * count;

            }else{
                var count = 10+Math.ceil(Math.random()*40);
                var delay = 60000/(40+Math.ceil(Math.random()*80));
                this.beatbar.addToQueue(count,delay)
                this.next_text = "";
                this.next_next_time = delay * count;
            }
        }
    }
    fglogic(){
        if(Date.now()-this.last_image_time > this.next_image_time && this.iterator < this.dataarr.length){

            this.last_image_time = Date.now();
            this.next_image_time = this.next_next_time;
            this.text = this.next_text;
            this.textobj.html(this.text);
            this.textobj.fitText();
            if(this.textobj.html()==""){
                this.textobj.addClass("hidden");
            }else{
                this.textobj.removeClass("hidden");
            }

            this.queue_image();
            $(this.img_selector).attr("src",this.dataarr[this.iterator][0])

            this.iterator++;
        }
        if(this.iterator >= this.dataarr.length){
            
        }
        
    }

    main_loop(){
        this.fglogic();
        this.beatbar.draw();
    }
}


//core logic above, site logic below

async function show_images(arr){
    $("img.display").attr("src",arr[0][0]);

    for(var i = 0; i < arr.length;i++){
        $("img.preload").attr("src",arr[i][0]);
        await sleep(5000);
        $("img.display").attr("src",arr[i][0]);
    };
}

fgm = null;
function main_loop(){
    fgm.main_loop();
    requestAnimationFrame(main_loop);
}
    
window.addEventListener("load",function(){
    $("#menu_submit").on("click",function(){
        arr = getImgArr("https://fgproxy1.herokuapp.com/http://boards.4chan.org/h/thread/6110391/fap-gauntlet-13");
        if(arr.length != 0){

            $("#fgmain").addClass("visible");
            $("#fgmenu").addClass("hidden");
            $("#fgmain").removeClass("hidden");
            $("#fgmenu").removeClass("visible");
            fgm = new FgManager(arr,"img.display","img.preload",$("div#text"),new Beatbar($("#beatbar")));
            
            requestAnimationFrame(main_loop);
        }else{
            alert("couldn't find any images in that thread");
        }
    })
})