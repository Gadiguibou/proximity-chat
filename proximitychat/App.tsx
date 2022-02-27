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
    latitudeDelta: 0.0024,
    longitudeDelta: 0.00011,
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

  socket.on("locations", (locations: UserInfo[]) => {
    // console.log(locations);
    setUsers(locations);
  });

  socket.on("local message", (message: UserMessage) => {
    let nextMessages = { ...messages };
    // console.log(JSON.stringify(nextMessages));
    nextMessages[message.id] = message.message;
    // console.log(nextMessages)
    setMessages(nextMessages);
    console.log(JSON.stringify(messages));
    setTimeout(() => {
      let nextMessages = { ...messages };
      if (nextMessages[message.id] === message.message) {
        delete nextMessages[message.id];
        setMessages(nextMessages);
        console.log(JSON.stringify(messages));
      }
    }, 15000);
  });

  // setSocket(nsocket)
  // socket.on("locations", (locations: UserInfo[]) => {
  //   console.log(locations)
  //   setUsers(locations);
  // });

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
        console.log(`emit response ${response}`);
      });
      setOwnMessage(text);
      setText("");
      setTimeout(() => {
        setOwnMessage("");
      }, 15000);
    }
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
    sendButton: {},
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
            <TextInput onChangeText={(textName) => setName(textName)} />
            <Button
              mode="contained"
              onPress={() => {
                setNotSet(false);
                startMap();
              }}
            >
              Chat
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
                >
                  Go
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
