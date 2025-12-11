declare module 'react' {
  export type ReactNode = any;
  export type FC<P = any> = (props: P & { children?: ReactNode }) => any;
  export function createContext<T = any>(defaultValue?: T): any;
  export function useContext<T = any>(context: any): T;
  export function useMemo<T = any>(factory: () => T, deps: any[]): T;
  export function useReducer<R extends (state: any, action: any) => any>(
    reducer: R,
    initialState: any
  ): [any, (action: Parameters<R>[1]) => void];
}

declare module 'react-native';
declare module 'react-native-gesture-handler';
declare module 'expo-status-bar';

declare module '@react-navigation/native' {
  export function NavigationContainer(props: any): any;
  export function useNavigation<T = any>(): T;
}

declare module '@react-navigation/native-stack' {
  export function createNativeStackNavigator<T = any>(): any;
  export type NativeStackScreenProps<T, K extends keyof T = keyof T> = any;
  export type NativeStackNavigationProp<T> = any;
}

declare module '@react-navigation/bottom-tabs' {
  export function createBottomTabNavigator<T = any>(): any;
}

declare module '@react-navigation/drawer' {
  export function createDrawerNavigator<T = any>(): any;
}

