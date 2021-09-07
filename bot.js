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
const opinEmoji = '🅾';

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
      message.guild.channels.cache.get(message.channel.id).send("オピンに参加する人は、" + opinEmoji + "リアクションを付けてね！");

      //オピン参加表示送信
      const title = "☆☆オピン参加確認☆☆";
      //const description = "Aさん\nBさん\nCさん\nDさん\nEさん\nFさん\nGさん\nHさん\nIさん\nJさん\nKさん\nLさん\nMさん\n" +
      //                    "Nさん\nOさん\nPさん\nQさん\nRさん\nSさん\nTさん\nUさん\nVさん\nWさん\nZさん\nXさん\nYさん\nZさん\n" +
      //                    "1さん\n2さん\n3さん\n4さん\n5さん\n6さん\n7さん\n8さん\n9さん\n0さん\n";
      const description = "";
      const gvgAttend = await message.guild.channels.cache.get(message.channel.id).send({
        embed: {
          color: 0x7289da,
          title: title,
          description: description
       }
      });
      gvgAttend.react(opinEmoji); 

      //ボタン生成
      const button = new opinButton.MessageButton()
      .setStyle('green')
      .setLabel('シャッフル！')
      .setID('opin-button_' + gvgAttend.id);

      //ボタン送信 
      message.channel.send('オピン参加者がそろったらシャッフルボタンを押してね！', button);
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

    //リアクションしたメッセージが出席確認用embedsに特定のリアクションしたの場合だけキューに追加
    if((reaction.message.embeds.length > 0) && 
      (reaction.emoji.name === opinEmoji) && 
      (reaction.message.embeds[0].title === "☆☆オピン参加確認☆☆")){
      //リアクションした人を取得
      await getOpinReactionUsers(reaction,opinEmoji);
    }else{
      logger.info("オピン参加確認用embeds以外につけたリアクションは無視");
    }

    return;

  });

  //--------------------------------------------------------------
  // ボタン押下時のイベント
  //--------------------------------------------------------------
  discordClient.on('clickButton', async (button) => { 

    await button.think(false);

    //ボタンID取得
    var button_id = button.id.substring(0,11);
    //メッセージID取得
    var message_id = button.id.substring(12);

    //ButtonIDがopin-buttonの場合
    if (button_id === 'opin-button') { 

      button.channel.messages.fetch(message_id)
          .then(targetMessage => {

            //メンバー情報取得
            var editDescription = targetMessage.embeds[0].description;
            //ボタン押下完了メッセージ
            button.reply.edit("シャッフル完了!!" , { code: true });

            //ここにランダム処理
            var TeamList = generateOpinTeam(editDescription);

            //オピン参加チーム送信
            for(var i =0;i<TeamList.length;i++){
                var title = "オピンチーム" + (i+1) ;

                var description = "";
                for(var j =0;j<TeamList[i].length;j++){
                  description = description + TeamList[i][j] + "\n";
                }

                if(TeamList[i].length === 10){
                  description = description + "--------------------\n計10名";
                }else{
                  description = description + "--------------------\n＋野良" + (10 - TeamList[i].length) + "名";

                }

                const opinAttend = button.channel.send({
                  embed: {
                    color: "RANDOM",
                    title: title,
                    description: description
                  }
               });
            }

              return;
            }
          );

    }

  });

  //--------------------------------------------------------------
  // ランダムチーム編成
  //--------------------------------------------------------------
  function generateOpinTeam(users)
  {
    //分割してユーザーに格納
    var userList = users.split("\n");
    //シャッフルしてユーザーリストにセット
    var shuffleUserList = shuffle(userList);

    //配列の長さ
    var b      = shuffleUserList.length,
    //10ずつに割る
    cnt    = 10,
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

  }
  //--------------------------------------------------------------
  // シャッフル関数
  //--------------------------------------------------------------
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) { // i = ランダムに選ぶ終点のインデックス
      const j = Math.floor(Math.random() * (i + 1));  // j = 範囲内から選ぶランダム変数
      [arr[j], arr[i]] = [arr[i], arr[j]]; // 分割代入 i と j を入れ替える
    }
    return arr;
  };


  //--------------------------------------------------------------
  // リアクションしたユーザー取得
  //--------------------------------------------------------------
  async function getOpinReactionUsers(reaction,emoji){

    reaction.message.reactions.cache.map(async (u_reaction) => { 

      var namelist = "";

      //リアクション絞り込み
      if (u_reaction.emoji.name !== emoji) return; 
      //ユーザー取得
      let reactedUsers = await u_reaction.users.fetch(); 
      //配列セット
      let array = Array.from(reactedUsers.values());

      //表示
      var count = 0
      array.forEach(function( value ) {
        if(value.bot === false){
          logger.info(value.username);
          namelist = namelist + value.username + "\n";
          count++;
        }

      });

      //メッセージ更新
      const embed = new Discord.MessageEmbed()
      .setTitle("☆☆オピン参加確認☆☆")
      .setColor(0x7289da)
      .setDescription(namelist)
      .setTimestamp()
      .setFooter("現在"+ count + "人");
      await reaction.message.edit(embed);

    });


    
  }

    
})().catch((e) => logger.error(e));




