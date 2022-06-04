const sleep = (milliseconds) => 
{
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function shuffle(array) 
{
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
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
        imgurl = "http:"+$(this).children(".fileThumb").attr("href");
        content = $(this).siblings("blockquote").text();
        tmp = []
        tmp.push(imgurl);
        tmp.push(content);
        arr.push(new Displayable(tmp));
    });

    console.log(arr);

    return arr;
}

class Displayable
{
    static video_formats = [".webm",".mp4",".mkv"]
    constructor(data_arr)
    {
        this.imgurl = data_arr[0]
        this.text = data_arr[1]
        this.is_video = false;
        for(var i = 0; i< Displayable.video_formats.length; i++)
        {
            if(data_arr[0].endsWith(Displayable.video_formats[i]))
            {
                this.is_video = true;
                break;
            }
        }
    }
}

class Beat
{
    constructor(delay)
    {
        this.delay = delay;
        this.sound_played = false;
        this.beatsound = new Audio('beat.wav');
    }
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
            this.queue.push(new Beat(this.final_element_delay));
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

        var i = 0;
        
        while(i<this.queue.length){
            this.queue[i].delay -= deltat;
            var distance = this.queue[i].delay;
            var sound_played = this.queue[i].sound_played;
            if(distance < -this.beatbartimelength - 10000){
                this.queue.splice(i,1);
                //i++; I don't think this increment is neccesary, another object will be at same index after splicing
                continue;
            }
            if(distance < this.beatbartimelength){
                this.context.arc(centerw+centerw*(distance/this.beatbartimelength),centerh,0.4*height,0,2*Math.PI);
                this.context.fill();
            };

            if(distance < 0 && !sound_played)
            {
                this.queue[i].beatsound.play();
                this.queue[i].sound_played = true;
            }

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
        "fast":80,
        "very fast":100,
        "extreme fast":140,
        "extremely fast":140,
    }

    constructor(arr,img_selector,preload_selector,video_selector, video_preload_selector, textjqobject, beatbar, max_durration, randomized, mute_video)
    {
        if(randomized)
        {
            arr = shuffle(arr);
        }
        this.img_selector = img_selector;
        this.preload_selector = preload_selector;
        this.video_selector = video_selector;
        this.video_preload_selector = video_preload_selector;
        this.textobj = textjqobject;
        this.beatbar = beatbar;
        this.dataarr = arr;
        this.stopflag=false;
        this.reexp = RegExp("([1-9]|[1-9][0-9]|1[0-9][0-9]), (very slow|slow|normal|medium|fast|very fast|extreme?ly fast), ([^,]+)");
        this.reexpalt = RegExp("([1-9]|[1-9][0-9]|1[0-9][0-9]), ([^,]+), (very slow|slow|normal|medium|fast|very fast|extreme?ly fast)");
        this.last_image_time = Date.now();
        this.iterator = -1;
        this.next_image_time = 0;
        this.max_durration = isNaN(max_durration) ? 20 * 1000 : max_durration * 1000;
        this.mute_video = mute_video;


        this.queue_image();
        this.iterator++;
    }

    extract_data_from_string(str, regex, regex_alt)
    {
        // try pattern 1
        var data = regex.exec(str);
                    
        // Some people write "normal" or "medium" (grip) and then specify speed.
        // Check if somebody didn't do that here.
        // If they did, use alt regex.
        if(data != null && (data[2] == "medium" || data[2] == "normal") && (!data[3].includes("medium") || !data[3].includes("normal")) )
        {
            var alt = regex_alt.exec(str);
            if (alt != null)
            {
                data = alt;
                tmp = data[2];
                data[2] = data[3];
                data[3] = tmp;
            }
        }

        if(data == null)
        {
            data = regex_alt.exec(str);
            if(data != null)
            {
                tmp = data[2];
                data[2] = data[3];
                data[3] = tmp;
            }
        }

        return data;
    }

    queue_image()
    {
        if(this.dataarr.length > this.iterator+1){

            if(this.dataarr[this.iterator+1].is_video)
            {
                //preload next video
                $(this.video_preload_selector + ">source").attr("src",this.dataarr[this.iterator+1].imgurl);
                $(this.video_preload_selector)[0].muted = true;
            }
            else
            {
                // preload next image
                $(this.preload_selector).attr("src",this.dataarr[this.iterator+1].imgurl);
            }

            var data = this.extract_data_from_string(this.dataarr[this.iterator+1].text, this.reexp, this.reexpalt)

            if(data != null)
            {
                console.log(data);
                var count = data[1];
                var delay = 60000/FgManager.speeds[data[2]];
                if (count * delay > this.max_durration)
                {
                    count = Math.ceil(this.max_durration /delay)
                }
                this.beatbar.addToQueue(count,delay)
                this.next_text = data[3];
                this.next_next_time = delay * count;

            }
            else
            {
                var delay = 60000/(40+Math.ceil(Math.random()*80));
                var count = 10+Math.ceil(Math.random()* (this.max_durration/delay - 10));
                
                if (count * delay > this.max_durration)
                {
                    count = Math.ceil(this.max_durration / delay)
                }
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
            if(this.textobj.html()==""){
                this.textobj.addClass("hidden");
            }else{
                this.textobj.removeClass("hidden");
                
            }
            this.textobj.css("font-size",window.height/21+"px");
            this.queue_image();
            var to_display = this.dataarr[this.iterator];
            if(to_display.is_video)
            {
                $(this.video_selector).attr("src",to_display.imgurl)
                if(this.mute_video)
                {
                    // Why is this needed...
                    // Browsers are tretarded.
                    $(this.video_selector)[0].muted = true;
                }
                $(this.img_selector).addClass("hidden");
                $(this.img_selector).removeClass("visible");
                $(this.video_selector).addClass("visible");
                $(this.video_selector).removeClass("hidden");
            }
            else
            {
                $(this.img_selector).attr("src",to_display.imgurl)
                $(this.video_selector).addClass("hidden");
                $(this.video_selector).removeClass("visible");
                $(this.img_selector).addClass("visible");
                $(this.img_selector).removeClass("hidden");
            }

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

fgm = null;
function main_loop(){
    fgm.main_loop();
    requestAnimationFrame(main_loop);
}


var nightmode = true;
function changeNightMode()
{
    if(nightmode)
    {
        $('body').css("background-color", "rgb(255,255,255)");
        nightmode = false;
        window.localStorage.setItem("nightmode", false);
    }
    else
    {
        $('body').css("background-color", "rgb(10,10,30)");
        nightmode = true;
        window.localStorage.setItem("nightmode", true);
    }
}

var mute = false;
function changeMute()
{
    if(mute)
    {
        $("#video_player").attr("muted", false);
        mute = false;
        window.localStorage.setItem("mute_videos", false);
    }
    else
    {
        $("#video_player").attr("muted", true);
        mute = true;
        window.localStorage.setItem("mute_videos", true);
    }
}
    
window.addEventListener("load",function(){
    $("#menu_submit").on("click",function(){
        window.localStorage.setItem("last_url",   $("#menu_text").val())
        window.localStorage.setItem("last_len",   $("#menu_length").val())
        window.localStorage.setItem("random",     $("#randomize").is(":checked"))
        window.localStorage.setItem("mute_videos",$("#mute_videos").is(":checked") );
        arr = getImgArr("https://fgproxy1.herokuapp.com/" + $("#menu_text").val());
        if(arr.length != 0){

            $("#fgmain").addClass("visible");
            $("#fgmenu").addClass("hidden");
            $("#fgmain").removeClass("hidden");
            $("#fgmenu").removeClass("visible");
            fgm = new FgManager(
                arr,
                "img#display",
                "img#preload",
                "video#video_player",
                "video#video_preload",
                $("div#text"),
                new Beatbar($("#beatbar")),
                parseInt($("#menu_length").val()),
                $("#randomize").is(":checked"),
                mute);
            
            requestAnimationFrame(main_loop);
        }else{
            alert("couldn't find any images in that thread");
        }
    });

    $("#night_mode").on("click",changeNightMode);
    $("#mute_videos").on("click",changeMute);

    var last_url = window.localStorage.getItem("last_url")
    var last_len = window.localStorage.getItem("last_len")
    if( last_url != null)
    {
        $("#menu_text").val(last_url)
    }
    if( last_len != null)
    {
        $("#menu_length").val(last_len)
    }

    var mode = window.localStorage.getItem("nightmode");
    if( mode != null )
    {
        if( mode == "false" )
        {
            $("#night_mode").attr("checked", false);
            changeNightMode();
        }
    }

    var randomized = window.localStorage.getItem("random");
    if( randomized != null )
    {
        if( randomized == "true" || randomized == true )
        {
            $("#randomize").attr("checked", true);
        }
    }

    var mute_videos = window.localStorage.getItem("mute_videos");
    if( mute_videos != null )
    {
        if( mute_videos == "true" || mute_videos == true )
        {
            $("#mute_videos").attr("checked", true);
            changeMute();
        }
    }
})
