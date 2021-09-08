//--------------------------------------------------------------
//
// Opin-Sensei BOT ver.1.0.0  
//
//修正履歴------------------------------------------------------
//2021/09/07  ver.1.0.0  正式リリース
//--------------------------------------------------------------

//--------------------------------------------------------------
//ライブラリインポート
//--------------------------------------------------------------
//環境変数読込
require('dotenv').config();
//Discordライブラリ
const Discord = require('discord.js');
//日付取得ライブラリ
require('date-utils');
//ログ出力設定
const log4js = require('log4js')
//ログファイル出力設定
log4js.configure({
  appenders : {
    bot : {type : 'file', filename : 'botlog.log'}
  },
  categories : {
    default : {appenders : ['bot'], level : 'trace'},
  }
});
const logger = log4js.getLogger('bot');
logger.level = 'trace';

//--------------------------------------------------------------
//Discord初期化
//--------------------------------------------------------------
const discordClient = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] ,
                                          messageCacheMaxSize: 20, 
                                          messageSweepInterval: 30});
//ボタンUI生成
const opinButton = require('discord.js-buttons')(discordClient);

//--------------------------------------------------------------
//prefix環境変数読込
//--------------------------------------------------------------
let prefix = process.env.PREFIX;

//--------------------------------------------------------------
//環境変数読込
//--------------------------------------------------------------
//BOTトークン
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

//オピン出席確認絵文字
const OPIN_SANKA = '🅾';
const OPIN_READER = '🧙‍♂️';
const OPIN_DEL = '❎';
const TEAM_COUNT = 10;


//--------------------------------------------------------------
//メイン処理
//--------------------------------------------------------------
(async function main() {

  //--------------------------------------------------------------
  //ディスコードトークンが設定されているか？
  //--------------------------------------------------------------
  if(BOT_TOKEN == undefined){
    logger.info('DISCORD_BOT_TOKENが未設定');
    process.exit(0);
  };

  //--------------------------------------------------------------
  //discordログイン
  //--------------------------------------------------------------
  discordClient.login(BOT_TOKEN);
   
  //--------------------------------------------------------------
  //Bot準備
  //--------------------------------------------------------------
  discordClient.once('ready', () => {
    logger.info("Discord connection successful !");
    logger.info("Discord Bot ready !");
    return ;
  });


  //--------------------------------------------------------------
  // テキストメッセージ受信時のイベント
  //--------------------------------------------------------------
  discordClient.on('message', async (message) => {
               
    //--------------------------------------------------------------
    //オピン参加者設定処理 
    //--------------------------------------------------------------
    const [commandOpin, ...argsOpin] = message.content.split(' ')
    if ((commandOpin === `${prefix}opin`)) {

      logger.info("チャンネルID" + message.channel.id);
      logger.info("オピン参加確認メッセージ処理をします");

      //メッセージ送信 
      message.guild.channels.cache.get(message.channel.id).send("オピンに参加する人は、" + OPIN_SANKA + "を押してね！\n" +
                                                                "参加を取り消したい場合は、" + OPIN_DEL + "を押してね！\n");

      //オピン参加表示送信
      const title = "☆☆オピン参加確認☆☆";
      //const opinMember = "";

      //デバッグ
      const opinMember = "Aさん\nBさん\nCさん\nDさん\nEさん\nFさん\nGさん\nHさん\nIさん\nJさん\nKさん\nLさん\nMさん\n" +
                          "Nさん\nOさん\nPさん\nQさん\nRさん\nSさん\nTさん\nUさん\nVさん\nWさん\nZさん\nXさん\nYさん\nZさん\n";
      //埋め込みメッセージ生成
      const opinAttendEmbed = await message.guild.channels.cache.get(message.channel.id).send({
        embed: {
          color: 0x7289da,
          title: title,
          description: opinMember,
          timestamp: new Date(),
          footer: {
            text: "現在0人"
          },
       }
      });
      opinAttendEmbed.react(OPIN_SANKA); 　//オピン参加者
      opinAttendEmbed.react(OPIN_DEL);     //参加取消

      //ボタン生成
      const button = new opinButton.MessageButton()
      .setStyle('green')
      .setLabel('チーム編成')
      .setID('opin-button_' + opinAttendEmbed.id);

      //ボタン送信 
      message.channel.send('オピン参加者がそろったら[チーム編成]ボタンを押してね！', button);
    }  
   
  });
 
  //--------------------------------------------------------------
  // リアクション時のイベント
  //--------------------------------------------------------------
  discordClient.on('messageReactionAdd', async (reaction, user) => {
    
    //メッセージ送信者がBOTのリアクションは無視
    if (user.bot){  return;  } 
  
    // リアクションを受信した時に、reaction.partialかどうか判断
    if (reaction.partial) {
      //reactionが含まれるメッセージが削除された場合、フェッチは API エラーを引き起こすので例外処理を作って回避
      try {
        //リアクションを取り出す
        await reaction.fetch();
      } catch (error) {
        //エラーの場合
        logger.error('リアクションメッセージフェッチ時に例外エラー発生: ' + error.name + ": " + error.message);
        return;
      }
    }

    //参加場合
    if((reaction.message.embeds.length > 0) && 
      (reaction.emoji.name === OPIN_SANKA) && 
      (reaction.message.embeds[0].title === "☆☆オピン参加確認☆☆")){

      //参加リアクションした人を取得
      await getOpinAttendReactionUsers(reaction,OPIN_SANKA);

    //参加取消の場合
    } else if((reaction.message.embeds.length > 0) && 
      (reaction.emoji.name === OPIN_DEL) && 
      (reaction.message.embeds[0].title === "☆☆オピン参加確認☆☆")){

      //参加リアクション取り消し
      await reaction.message.reactions.resolve(OPIN_SANKA).users.remove(user);
      await reaction.message.reactions.resolve(OPIN_DEL).users.remove(user);

      //参加リアクションした人を取得
      await getOpinAttendReactionUsers(reaction,OPIN_SANKA);

    }else{
      logger.info("オピン参加確認用embeds以外につけたリアクションは無視");
    }

    return;

  });

  //--------------------------------------------------------------
  // ボタン押下時のイベント
  //--------------------------------------------------------------
  discordClient.on('clickButton', async (button) => { 

    //考え中表示
    await button.think(false);
    //ボタンID取得
    var buttonId = button.id.substring(0,11);
    //メッセージID取得
    var messageId = button.id.substring(12);

    // //ButtonIDがopin-button以外の場合
    if (buttonId != 'opin-button') {return;}

    //ボタンした時に参加メンバー一覧の埋め込みメッセージをmessage_idから取得
    button.channel.messages.fetch(messageId).then( async targetMessage => {

      //メンバー情報取得
      var member = targetMessage.embeds[0].description;

      if(member === null){
        //ボタン押下完了メッセージ
        button.reply.edit("参加者がいません！！" , { code: true });
        return;
      }

      //ボタン押下完了メッセージ
      button.reply.edit("チーム編成完了!!" , { code: true });             
      //メッセージ送信 
      button.channel.send(OPIN_READER + "マークが付いている人がオピン部屋を作ってね！");
      //ここにランダム処理
      var teamList = generateOpinTeam(member,TEAM_COUNT);
      //オピン参加チーム送信
      sendOpinTeam(button,teamList,TEAM_COUNT);

     }); 
  });

  //--------------------------------------------------------------
  // オピン参加チーム送信
  //--------------------------------------------------------------
  async function sendOpinTeam(button,teamList,cnt)
  {
    //オピン参加チーム送信
    for(var i =0;i<teamList.length;i++){

      var title = "オピンチーム_" + (i+1) ;

      //チームメンバー生成
      var teamMember = "";
      for(var j =0; j < teamList[i].length; j++){
        //先頭の人が隊長（部屋作る人）
        if(j === 0){
          teamList[i][j] = teamList[i][j] + OPIN_READER;
        }
        //メンバー生成
        teamMember = teamMember + teamList[i][j] + "\n";
      }

      //メンバーカウント取得
      var count = "";
      if(teamList[i].length === cnt){
        count = "計" + teamList[i].length + "名";
      }else{
        count = "計" + teamList[i].length + "名 ＋ 野良" + (cnt - teamList[i].length) + "名";
      }

      //埋め込みメッセージ生成
      const opinTeamEmbed = await button.channel.send({
      embed: {
            color: "RANDOM",
            title: title,
            description: teamMember,
            timestamp: new Date(),
            footer: {
              text: count
            },
          }
      });
    }
    return;
  };

  //--------------------------------------------------------------
  // ランダムチーム編成
  //--------------------------------------------------------------
  function generateOpinTeam(member,cnt)
  {
    //分割してユーザーに格納
    var userList = member.split("\n");
    //シャッフルしてユーザーリストにセット
    var shuffleUserList = shuffle(userList);
    //配列の長さ
    var b = shuffleUserList.length,
    //新しい配列
    newUserList = [];
    for(var i = 0; i < Math.ceil(b / cnt); i++) {
      var j = i * cnt;
      // i*cnt番目からi*cnt+cnt番目まで取得
      var p = shuffleUserList.slice(j, j + cnt); 
      // 取得したものをnewUserListに追加
      newUserList.push(p);
    }
    return newUserList;
  };

  //--------------------------------------------------------------
  // シャッフル関数
  //--------------------------------------------------------------
  function shuffle(arr) {
    // i = ランダムに選ぶ終点のインデックス
    for (let i = arr.length - 1; i > 0; i--) { 
      // j = 範囲内から選ぶランダム変数
      const j = Math.floor(Math.random() * (i + 1));  
      // 分割代入 i と j を入れ替える
      [arr[j], arr[i]] = [arr[i], arr[j]]; 
    }
    return arr;
  };

  //--------------------------------------------------------------
  // 参加リアクションしたユーザー取得&メッセージ更新
  //--------------------------------------------------------------
  async function getOpinAttendReactionUsers(reaction,emoji){

    reaction.message.reactions.cache.map(async (u_reaction) => { 

      //リアクション絞り込み
      if (u_reaction.emoji.name !== emoji) return; 
      //ユーザー取得
      let reactedUsers = await u_reaction.users.fetch(); 
      //配列セット
      let array = Array.from(reactedUsers.values());
      //タイトル取得
      const title = reaction.message.embeds[0].title;
      //リアクションからメンバーリスト取得
      let count = 0;
      let namelist = "";
      array.forEach(function( value ) {
        if(value.bot === false){
          logger.info(value.username);
          namelist = namelist + value.username + "\n";
          count++;
        }
      });

      //デバッグ
      namelist = "Aさん\nBさん\nCさん\nDさん\nEさん\nFさん\nGさん\nHさん\nIさん\nJさん\nKさん\nLさん\nMさん\n" +
                 "Nさん\nOさん\nPさん\nQさん\nRさん\nSさん\nTさん\nUさん\nVさん\nWさん\nZさん\nXさん\nYさん\nZさん\n" + namelist;

      //埋め込みメッセージ更新
      const embed = new Discord.MessageEmbed()
      .setTitle(title)
      .setColor(0x7289da)
      .setDescription(namelist)
      .setTimestamp()
      .setFooter("現在"+ count + "人");
      await reaction.message.edit(embed);
    });   
  };
    
})().catch((e) => logger.error(e));




