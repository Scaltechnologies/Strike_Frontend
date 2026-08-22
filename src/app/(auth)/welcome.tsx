import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import Text from '../../components/Text';


const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>

      {/* Top Left Decorative Circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />
      <View style={styles.circle3} />

      {/* Logo */}
      <Text style={styles.logo}>Strike</Text>

      {/* Headline */}
      <View style={styles.textContainer}>
        <Text style={styles.text}>
          Your <Text style={styles.bold}>meal cards,</Text>{'\n'}
          <Text style={styles.bold}>unified</Text> and{' '}
          <Text style={styles.bold}>ready</Text>{'\n'}
          to use.
        </Text>
      </View>

      {/* Arrow Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/(auth)/login')}
      >
        <Text style={styles.arrow}>→</Text>
      </TouchableOpacity>

      {/* Bottom Right Pink Circle */}
      <View style={styles.bottomCircle} />

      {/* Bottom Illustration */}
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAD9C1',
    alignItems: 'center',
    overflow: 'hidden',
  },

  // TOP LEFT CIRCLES
  circle1: {
    position: 'absolute',
    top: -70,
    left: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#F4A482',
  },
  circle2: {
    position: 'absolute',
    top: -20,
    left: 20,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#F7BFA8',
    opacity: 0.85,
  },
  circle3: {
    position: 'absolute',
    top: 80,
    left: -30,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F9CDB8',
    opacity: 0.5,
  },

  // LOGO
  logo: {
    marginTop: height * 0.17,
    fontSize: 40,
    fontWeight: '800',
    color: '#C14A00',
    letterSpacing: 1,
  },

  // HEADLINE
  textContainer: {
    marginTop: 18,
    paddingHorizontal: 28,
  },
  text: {
    fontSize: 32,
    textAlign: 'center',
    color: '#1A1A1A',
    lineHeight: 46,
    fontWeight: '400',
  },
  bold: {
    fontWeight: '800',
  },

  // ARROW BUTTON
  button: {
    marginTop: 38,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#C14A00',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  arrow: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
  },

  // BOTTOM RIGHT CIRCLE
  bottomCircle: {
    position: 'absolute',
    bottom: height * 0.22,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F4A482',
    opacity: 0.55,
  },

  // ILLUSTRATION
  imageWrapper: {
    position: 'absolute',
    bottom: 0,
    width: width,
    height: height * 0.4,
  },
  image: {
    width: width,
    height: '100%',
  },
});