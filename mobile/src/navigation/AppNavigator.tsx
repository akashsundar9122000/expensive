import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import DashboardScreen from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import SubscriptionsScreen from '../screens/SubscriptionsScreen';
import InvestmentsScreen from '../screens/InvestmentsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { Colors } from '../theme/colors';
import { authService } from '../services/authService';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AddButton({ onPress }: { onPress: () => void }) {
    return (
        <TouchableOpacity style={tabStyles.addBtnContainer} onPress={onPress} activeOpacity={0.8}>
            <LinearGradient
                colors={Colors.gradientPrimary as any}
                style={tabStyles.addBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <Ionicons name="add" size={30} color="#FFF" />
            </LinearGradient>
        </TouchableOpacity>
    );
}

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.tabBarBg,
                    borderTopColor: Colors.border,
                    borderTopWidth: 1,
                    height: 70,
                    paddingBottom: 10,
                    paddingTop: 8,
                    position: 'absolute',
                    elevation: 0,
                },
                tabBarActiveTintColor: Colors.tabBarActive,
                tabBarInactiveTintColor: Colors.tabBarInactive,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: string = 'home';
                    if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'Transactions') iconName = focused ? 'receipt' : 'receipt-outline';
                    else if (route.name === 'AddExpenseTab') iconName = 'add-circle';
                    else if (route.name === 'Investments') iconName = focused ? 'trending-up' : 'trending-up-outline';
                    else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';

                    return <Ionicons name={iconName as any} size={22} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Home' }} />
            <Tab.Screen name="Transactions" component={TransactionsScreen} />
            <Tab.Screen
                name="AddExpenseTab"
                component={AddExpenseScreen}
                options={({ navigation }) => ({
                    tabBarLabel: '',
                    tabBarButton: (props) => <AddButton onPress={() => navigation.navigate('AddExpense')} />,
                })}
            />
            <Tab.Screen name="Investments" component={InvestmentsScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const loggedIn = await authService.isLoggedIn();
        setIsLoggedIn(loggedIn);
    };

    if (isLoggedIn === null) {
        return (
            <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="wallet" size={48} color={Colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{ headerShown: false }}
                initialRouteName={isLoggedIn ? 'Main' : 'Login'}
            >
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Signup" component={SignupScreen} />
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen
                    name="AddExpense"
                    component={AddExpenseScreen}
                    options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}

const tabStyles = StyleSheet.create({
    addBtnContainer: {
        top: -20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 10,
    },
});
