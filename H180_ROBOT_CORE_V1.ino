/*
  HUMANOID 180 — ROBOT CORE V1
  ESP32 KS0413 + PCA9685 KS0065 + MPU6050 KS0170
  SAFE DEFAULT: real servo output disabled.
*/
#include <WiFi.h>
#include <WebServer.h>
#define ENABLE_REAL_SERVOS false
#define ROBOT_CORE_VERSION "H180-RC-V1.0"
#define WATCHDOG_MS 1500
WebServer server(80);
unsigned long lastCommandMs=0;
bool estop=true;
const char* WIFI_SSID="CHANGE_ME";
const char* WIFI_PASSWORD="CHANGE_ME";
void cors(){server.sendHeader("Access-Control-Allow-Origin","*");server.sendHeader("Access-Control-Allow-Headers","Content-Type");server.sendHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");}
void statusHandler(){cors();String body="{\\"firmware\\":\\""+String(ROBOT_CORE_VERSION)+"\\",\\"status\\":\\"connected\\",\\"realServoOutput\\":"+String(ENABLE_REAL_SERVOS?"true":"false")+",\\"estop\\":"+String(estop?"true":"false")+",\\"dof\\":12}";server.send(200,"application/json",body);}
void commandHandler(){cors();if(server.method()==HTTP_OPTIONS){server.send(204);return;}lastCommandMs=millis();if(!ENABLE_REAL_SERVOS){server.send(423,"application/json","{\\"ok\\":false,\\"reason\\":\\"REAL_SERVO_OUTPUT_DISABLED\\"}");return;}if(estop){server.send(423,"application/json","{\\"ok\\":false,\\"reason\\":\\"ESTOP_ACTIVE\\"}");return;}server.send(501,"application/json","{\\"ok\\":false,\\"reason\\":\\"COMMAND_ENGINE_NOT_IMPLEMENTED\\"}");}
void setup(){Serial.begin(115200);WiFi.mode(WIFI_STA);WiFi.begin(WIFI_SSID,WIFI_PASSWORD);unsigned long start=millis();while(WiFi.status()!=WL_CONNECTED&&millis()-start<15000){delay(250);}server.on("/status",HTTP_GET,statusHandler);server.on("/command",HTTP_POST,commandHandler);server.on("/command",HTTP_OPTIONS,commandHandler);server.begin();}
void loop(){server.handleClient();if(!estop&&millis()-lastCommandMs>WATCHDOG_MS){estop=true;}}
