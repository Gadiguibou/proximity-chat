import React, { useEffect, useState } from "react";
import MapView, { Marker } from "react-native-maps";
import { Location, User, UserInfo, UserMessage } from "./Interfaces";
import {
  Image,
  TextInput,
  StyleSheet,
  View,
  Text,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Chip, Modal, Button, Portal, Provider } from "react-native-paper";
import io, { Socket } from "socket.io-client";
import * as GeoLocation from "expo-location";
import emojis from "./Emojis";
import { StatusBar } from "expo-status-bar";

export default function App() {
  const [socket, setSocket] = useState<Socket>(
    io("http://proximitychat.glcrx.com", { transports: ["websocket"] })
  );
  // io("http://localhost:3000/", {transports: ['websocket']})

  const [visible, setModalVisibility] = React.useState(true);
  const [name, setName] = React.useState("");
  const [notSet, setNotSet] = React.useState(true);
  //modal
  const [location, setLocation] = useState<any>(null);
  const [ownMessage, setOwnMessage] = React.useState("");
  const [text, setText] = React.useState("");
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [messages, setMessages] = useState<any>({});
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0044,
    longitudeDelta: 0.00021,
  });
  const containerStyle = { backgroundColor: "white", padding: 20 };

  const startMap = async () => {
    setModalVisibility(false);
    GeoLocation.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== "granted") {
        console.warn("Permission to access location was denied");
        return;
      }
      GeoLocation.watchPositionAsync(
        { accuracy: 6, distanceInterval: 1 },
        (location) => {
          setLocation(location);
          setMapRegion({
            latitude: Number(location.coords.latitude),
            longitude: Number(location.coords.longitude),
            latitudeDelta: mapRegion.latitudeDelta,
            longitudeDelta: mapRegion.longitudeDelta,
          });
          socket.emit("location", name, {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      );
    });
  };

  useEffect(() => {
    socket.on("locations", (locations: UserInfo[]) => {
      setUsers(locations);
    });

    socket.on("local message", (message: UserMessage) => {
      let nextMessages = {...messages};
      // console.log(JSON.stringify(nextMessages));
      if (message.id in nextMessages && nextMessages[message.id] === message.message) {
        return
      } else {
        nextMessages[message.id] = message.message;
        console.log("allmsgs", nextMessages)
        setMessages(nextMessages);
        clearMessageTimer({...message})
      }
    })
  }, [])

  const clearMessageTimer = (mes: UserMessage) => {
    setTimeout(() => {
      console.log("clear msg: " , mes)
      let nextMessages = {...messages};
      if (nextMessages[mes.id] === mes.message) {
        delete nextMessages[mes.id];
        setMessages(nextMessages);
      }
      setMessages({}); // Clears all messages, leaving it there for now
    }, 7000, mes);
  }

  const toEmoji = (name: String): String => {
    const key =
      name.split("").reduce((acc, c) => c.charCodeAt(0) * acc, 1) %
      emojis.length;
    return emojis[key];
  };

  const handleSendMessage = () => {
    if (text.trim().length > 0) {
      socket.emit("local message", name, text, (response: any) => {
        // What's up with this callback?
        // console.log(`emit response ${response.status}`);
      });
      setOwnMessage(text);
      setText("");
      setTimeout(() => {
        setOwnMessage("");
      }, 7000);
    }
  };

  const colors = {
    green: "#20ba39",
    blue: "#128ff7",
  };
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    inner: {
      flex: 1,
      alignItems: "stretch",
      justifyContent: "flex-start",
    },
    map: {
      flexGrow: 10,
      flexShrink: 0,
      flexBasis: "auto",
    },
    inputContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
    },
    input: {
      flex: 1,
      height: 40,
      paddingHorizontal: 12,
      margin: 10,
      borderColor: "#777777",
      borderWidth: 1,
      borderRadius: 20,
    },
    nameInput: {
      borderBottomColor: colors.blue,
      borderBottomWidth: 2,
      fontSize: 16,
      height: 30,
      margin: 10,
    },
    button: {
      borderRadius: 20,
    },
  });
  if (notSet) {
    return (
      <Provider>
        <Portal>
          <Modal
            dismissable={false}
            visible={visible}
            onDismiss={startMap}
            contentContainerStyle={containerStyle}
          >
            <Text style={{ fontSize: 16, textAlign: "center" }}>
              Welcome to{" "}
              <Text style={{ fontWeight: "bold" }}>
                <Text style={{ color: colors.blue }}>Chat</Text>
                <Text style={{ color: colors.green }}>Area</Text>
              </Text>
              ! 🌎 💬
            </Text>
            <Text
              style={{
                fontSize: 16,
                textAlign: "center",
                paddingHorizontal: 20,
              }}
            >
              Enter your name to start chatting with others nearby!
            </Text>
            <TextInput
              style={styles.nameInput}
              selectionColor={colors.green}
              onChangeText={(textName) => setName(textName)}
            />
            <Button
              mode="contained"
              onPress={() => {
                setNotSet(false);
                startMap();
              }}
              style={styles.button}
              color={colors.green}
            >
              Start chatting
            </Button>
          </Modal>
        </Portal>
      </Provider>
    );
  } else {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={-400}
        enabled
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            <MapView
              zoomEnabled={false}
              pitchEnabled={false}
              scrollEnabled={false}
              region={mapRegion}
              style={styles.map}
            >
              {location && (
                <View>
                  <Marker
                    style={{ justifyContent: "center", alignItems: "center" }}
                    coordinate={{
                      latitude: location.coords.latitude,
                      longitude: location.coords.longitude,
                    }}
                  >
                    {ownMessage ? (
                      <View
                        style={{
                          backgroundColor: "#fefefe",
                          borderRadius: 12,
                          padding: 5,
                        }}
                      >
                        <Text numberOfLines={5} style={{ maxWidth: 100 }}>
                          {ownMessage}
                        </Text>
                      </View>
                    ) : (
                      <View></View>
                    )}
                    <Text style={{ fontSize: 35 }}>{toEmoji(name)}</Text>
                  </Marker>
                </View>
              )}
              {users
                .filter((user: UserInfo) => user.id !== name)
                .map((user: UserInfo, index: number) => (
                  <View key={index}>
                    <Marker
                      coordinate={{
                        latitude: user.location.latitude,
                        longitude: user.location.longitude,
                      }}
                      style={{ justifyContent: "center", alignItems: "center" }}
                    >
                      {messages[user.id] ? (
                        <View
                          style={{
                            backgroundColor: "#fefefe",
                            borderRadius: 12,
                            padding: 5,
                          }}
                        >
                          <Text numberOfLines={5} style={{ maxWidth: 100 }}>
                            {messages[user.id]}
                          </Text>
                        </View>
                      ) : (
                        <View></View>
                      )}
                      <Text style={{ fontSize: 35 }}>{toEmoji(user.id)}</Text>
                    </Marker>
                  </View>
                ))}
            </MapView>
            <View>
              <View style={styles.inputContainer}>
                <TextInput
                  value={text}
                  placeholder="Send a message"
                  onChangeText={setText}
                  style={styles.input}
                />
                <Button
                  disabled={text.trim().length === 0}
                  onPress={handleSendMessage}
                  style={styles.button}
                  color={colors.green}
                >
                  Send
                </Button>
                <View style={{ width: 10 }}></View>
              </View>
            </View>
            <View style={{ height: Platform.OS === "ios" ? 10 : 0 }}></View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  }
}
