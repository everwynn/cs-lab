// ============================================================
// 设计模式可视化 —— 5 个 MVP 模式定义与步骤生成器
// ============================================================

export interface PatternObject {
  id: string
  label: string
  subtitle?: string
  type: 'interface' | 'class' | 'object'
  x: number
  y: number
  w: number
  h: number
}

export interface PatternMessage {
  from: string
  to: string
  label: string
}

export interface PatternStep {
  description: string
  codeLine: number
  activeObjects: string[]
  createdObjects?: string[]
  message?: PatternMessage
  state?: Record<string, string>
}

export interface PatternDefinition {
  id: string
  name: string
  category: 'creational' | 'structural' | 'behavioral'
  icon: string
  desc: string
  scenario: string
  code: string
  objects: PatternObject[]
  generateSteps: () => PatternStep[]
}

const mkStep = (
  description: string,
  codeLine: number,
  activeObjects: string[],
  message?: PatternMessage,
  state?: Record<string, string>,
  createdObjects?: string[]
): PatternStep => ({
  description,
  codeLine,
  activeObjects,
  message,
  state,
  createdObjects,
})

// ============================================================
// 1. 单例模式 Singleton
// ============================================================
export const singletonPattern: PatternDefinition = {
  id: 'singleton',
  name: '单例模式',
  category: 'creational',
  icon: '1️⃣',
  desc: '确保一个类只有一个实例，并提供一个全局访问点。',
  scenario: '配置管理器：多个客户端获取配置对象，应该得到同一个实例。',
  code: `public class ConfigManager {
    private static ConfigManager instance;
    private Map<String, String> settings;

    private ConfigManager() {
        settings = new HashMap<>();
    }

    public static ConfigManager getInstance() {
        if (instance == null) {
            instance = new ConfigManager();
        }
        return instance;
    }

    public void set(String key, String value) {
        settings.put(key, value);
    }

    public String get(String key) {
        return settings.get(key);
    }
}`,
  objects: [
    { id: 'configManager', label: 'ConfigManager', type: 'class', x: 300, y: 40, w: 200, h: 64 },
    { id: 'clientA', label: '客户端 A', type: 'object', x: 80, y: 40, w: 140, h: 56 },
    { id: 'clientB', label: '客户端 B', type: 'object', x: 580, y: 40, w: 140, h: 56 },
    { id: 'instance', label: '唯一实例', subtitle: 'settings = {}', type: 'object', x: 300, y: 180, w: 200, h: 64 },
    { id: 'shared', label: '共享配置', subtitle: 'theme: dark', type: 'object', x: 340, y: 320, w: 120, h: 56 },
  ],
  generateSteps: () => [
    mkStep('客户端 A 调用 ConfigManager.getInstance() 获取配置对象。', 10, ['clientA', 'configManager'], { from: 'clientA', to: 'configManager', label: 'getInstance()' }),
    mkStep('ConfigManager 检查 instance 字段，发现当前为空。', 11, ['configManager', 'instance'], undefined, { instance: 'null' }),
    mkStep('首次调用，ConfigManager 创建新的 ConfigManager 实例。', 12, ['configManager', 'instance'], undefined, undefined, ['instance']),
    mkStep('新实例初始化完成，内部 settings 为空。', 6, ['instance'], undefined, { instance: 'settings = {}' }),
    mkStep('ConfigManager 将创建好的实例返回给客户端 A。', 14, ['configManager', 'clientA', 'instance'], { from: 'configManager', to: 'clientA', label: 'return instance' }, { instance: 'settings = {}' }),
    mkStep('客户端 A 设置主题配置 theme = dark。', 18, ['clientA', 'instance'], { from: 'clientA', to: 'instance', label: 'set("theme", "dark")' }, { instance: 'theme: dark' }),
    mkStep('客户端 B 也调用 ConfigManager.getInstance()。', 10, ['clientB', 'configManager'], { from: 'clientB', to: 'configManager', label: 'getInstance()' }, { instance: 'theme: dark' }),
    mkStep('ConfigManager 检查 instance，发现实例已存在，不再创建。', 11, ['configManager', 'instance'], undefined, { instance: 'theme: dark' }),
    mkStep('ConfigManager 将同一个实例返回给客户端 B。', 14, ['configManager', 'clientB', 'instance'], { from: 'configManager', to: 'clientB', label: 'return instance' }, { instance: 'theme: dark' }),
    mkStep('客户端 B 读取 theme 配置，得到客户端 A 设置的值，证明两者共享同一实例。', 22, ['clientB', 'instance'], { from: 'clientB', to: 'instance', label: 'get("theme")' }, { instance: 'theme: dark' }),
  ],
}

// ============================================================
// 2. 工厂方法模式 Factory Method
// ============================================================
export const factoryPattern: PatternDefinition = {
  id: 'factory',
  name: '工厂方法模式',
  category: 'creational',
  icon: '🏭',
  desc: '定义创建对象的接口，由子类决定实例化哪个类。',
  scenario: '物流系统：根据运输方式创建卡车或轮船，统一调用 deliver()。',
  code: `interface Transport {
    void deliver();
}

class Truck implements Transport {
    public void deliver() {
        System.out.println("卡车运输");
    }
}

class Ship implements Transport {
    public void deliver() {
        System.out.println("轮船运输");
    }
}

abstract class Logistics {
    abstract Transport createTransport();

    void planDelivery() {
        Transport t = createTransport();
        t.deliver();
    }
}

class RoadLogistics extends Logistics {
    Transport createTransport() {
        return new Truck();
    }
}

class SeaLogistics extends Logistics {
    Transport createTransport() {
        return new Ship();
    }
}`,
  objects: [
    { id: 'transport', label: '<<interface>>\nTransport', type: 'interface', x: 80, y: 40, w: 160, h: 64 },
    { id: 'truck', label: 'Truck', type: 'class', x: 20, y: 180, w: 120, h: 56 },
    { id: 'ship', label: 'Ship', type: 'class', x: 180, y: 180, w: 120, h: 56 },
    { id: 'logistics', label: '<<abstract>>\nLogistics', type: 'class', x: 360, y: 40, w: 180, h: 64 },
    { id: 'roadLogistics', label: 'RoadLogistics', type: 'class', x: 320, y: 180, w: 140, h: 56 },
    { id: 'seaLogistics', label: 'SeaLogistics', type: 'class', x: 500, y: 180, w: 140, h: 56 },
    { id: 'client', label: 'Client', type: 'object', x: 600, y: 40, w: 120, h: 56 },
  ],
  generateSteps: () => [
    mkStep('客户端创建 RoadLogistics（公路物流）对象。', 25, ['client', 'roadLogistics'], { from: 'client', to: 'roadLogistics', label: 'new RoadLogistics()' }, undefined, ['roadLogistics']),
    mkStep('客户端调用 planDelivery()，该方法定义在抽象父类 Logistics 中。', 16, ['client', 'roadLogistics', 'logistics'], { from: 'client', to: 'roadLogistics', label: 'planDelivery()' }),
    mkStep('planDelivery() 调用由子类实现的 createTransport()。', 18, ['logistics', 'roadLogistics'], { from: 'logistics', to: 'roadLogistics', label: 'createTransport()' }),
    mkStep('RoadLogistics 创建并返回 Truck 实例。', 26, ['roadLogistics', 'truck'], { from: 'roadLogistics', to: 'truck', label: 'new Truck()' }, undefined, ['truck']),
    mkStep('Truck 实现 Transport 接口，可以作为统一类型使用。', 4, ['truck', 'transport'], { from: 'truck', to: 'transport', label: 'implements' }),
    mkStep('planDelivery() 得到 Truck 后，调用其 deliver() 方法。', 19, ['logistics', 'truck'], { from: 'logistics', to: 'truck', label: 'deliver()' }),
    mkStep('Truck 执行公路运输。', 5, ['truck'], undefined, { truck: '卡车运输' }),
    mkStep('客户端切换为 SeaLogistics（海运物流）。', 25, ['client', 'seaLogistics'], { from: 'client', to: 'seaLogistics', label: 'new SeaLogistics()' }, undefined, ['seaLogistics']),
    mkStep('同样调用 planDelivery()，这次由 SeaLogistics 响应 createTransport()。', 18, ['logistics', 'seaLogistics'], { from: 'logistics', to: 'seaLogistics', label: 'createTransport()' }),
    mkStep('SeaLogistics 创建并返回 Ship 实例。', 31, ['seaLogistics', 'ship'], { from: 'seaLogistics', to: 'ship', label: 'new Ship()' }, undefined, ['ship']),
    mkStep('Ship 也实现 Transport 接口，客户端无需关心具体类型。', 9, ['ship', 'transport'], { from: 'ship', to: 'transport', label: 'implements' }),
    mkStep('planDelivery() 调用 Ship.deliver() 完成海运。', 19, ['logistics', 'ship'], { from: 'logistics', to: 'ship', label: 'deliver()' }, { ship: '轮船运输' }),
  ],
}

// ============================================================
// 3. 观察者模式 Observer
// ============================================================
export const observerPattern: PatternDefinition = {
  id: 'observer',
  name: '观察者模式',
  category: 'behavioral',
  icon: '👀',
  desc: '定义对象间的一对多依赖，当一个对象状态改变时，所有依赖者自动收到通知。',
  scenario: '新闻订阅：订阅者自动接收新闻社发布的最新消息。',
  code: `interface Observer {
    void update(String news);
}

class NewsAgency {
    private List<Observer> observers = new ArrayList<>();

    void attach(Observer o) {
        observers.add(o);
    }

    void detach(Observer o) {
        observers.remove(o);
    }

    void notifyObservers(String news) {
        for (Observer o : observers) {
            o.update(news);
        }
    }

    void publish(String news) {
        notifyObservers(news);
    }
}

class Subscriber implements Observer {
    private String name;
    Subscriber(String name) { this.name = name; }

    public void update(String news) {
        System.out.println(name + " 收到: " + news);
    }
}`,
  objects: [
    { id: 'observer', label: '<<interface>>\nObserver', type: 'interface', x: 80, y: 40, w: 160, h: 64 },
    { id: 'subject', label: 'NewsAgency', subtitle: 'observers = []', type: 'class', x: 400, y: 40, w: 180, h: 64 },
    { id: 'subA', label: 'Subscriber A', type: 'object', x: 80, y: 220, w: 140, h: 56 },
    { id: 'subB', label: 'Subscriber B', type: 'object', x: 260, y: 220, w: 140, h: 56 },
    { id: 'subC', label: 'Subscriber C', type: 'object', x: 440, y: 220, w: 140, h: 56 },
    { id: 'news', label: '最新消息', subtitle: '—', type: 'object', x: 680, y: 40, w: 120, h: 56 },
  ],
  generateSteps: () => [
    mkStep('创建新闻社（Subject）和三名订阅者。', 12, ['subject'], undefined, { subject: 'observers = []' }, ['subA', 'subB', 'subC']),
    mkStep('订阅者 A 调用 attach() 向新闻社注册。', 14, ['subA', 'subject'], { from: 'subA', to: 'subject', label: 'attach(A)' }, { subject: 'observers = [A]' }),
    mkStep('订阅者 B 注册到新闻社。', 14, ['subB', 'subject'], { from: 'subB', to: 'subject', label: 'attach(B)' }, { subject: 'observers = [A, B]' }),
    mkStep('订阅者 C 也注册到新闻社。', 14, ['subC', 'subject'], { from: 'subC', to: 'subject', 'label': 'attach(C)' }, { subject: 'observers = [A, B, C]' }),
    mkStep('新闻社发布新闻 "Hello World"。', 28, ['subject', 'news'], { from: 'news', to: 'subject', label: 'publish("Hello World")' }, { subject: 'observers = [A, B, C]', news: 'Hello World' }),
    mkStep('新闻社遍历观察者列表，通知 A。', 22, ['subject', 'subA'], { from: 'subject', to: 'subA', label: 'update(...)' }, { subA: 'A 收到: Hello World' }),
    mkStep('通知 B。', 22, ['subject', 'subB'], { from: 'subject', to: 'subB', label: 'update(...)' }, { subB: 'B 收到: Hello World' }),
    mkStep('通知 C。', 22, ['subject', 'subC'], { from: 'subject', to: 'subC', label: 'update(...)' }, { subC: 'C 收到: Hello World' }),
    mkStep('订阅者 B 取消订阅。', 18, ['subB', 'subject'], { from: 'subB', to: 'subject', label: 'detach(B)' }, { subject: 'observers = [A, C]' }),
    mkStep('新闻社再次发布新闻 "Design Patterns"。', 28, ['subject', 'news'], { from: 'news', to: 'subject', label: 'publish("Design Patterns")' }, { subject: 'observers = [A, C]', news: 'Design Patterns' }),
    mkStep('只有 A 和 C 收到更新，B 不再接收。', 22, ['subject', 'subA', 'subC'], undefined, { subA: 'A 收到: Design Patterns', subC: 'C 收到: Design Patterns' }),
  ],
}

// ============================================================
// 4. 策略模式 Strategy
// ============================================================
export const strategyPattern: PatternDefinition = {
  id: 'strategy',
  name: '策略模式',
  category: 'behavioral',
  icon: '🎯',
  desc: '定义一系列算法，把它们封装起来，并且使它们可以互相替换。',
  scenario: '导航应用：根据用户选择，使用不同的路线规划策略。',
  code: `interface RouteStrategy {
    String buildRoute(String from, String to);
}

class CarStrategy implements RouteStrategy {
    public String buildRoute(String from, String to) {
        return "驾车路线: " + from + " -> " + to;
    }
}

class WalkingStrategy implements RouteStrategy {
    public String buildRoute(String from, String to) {
        return "步行路线: " + from + " -> " + to;
    }
}

class PublicTransportStrategy implements RouteStrategy {
    public String buildRoute(String from, String to) {
        return "公交路线: " + from + " -> " + to;
    }
}

class Navigator {
    private RouteStrategy strategy;

    void setStrategy(RouteStrategy s) {
        this.strategy = s;
    }

    String buildRoute(String from, String to) {
        return strategy.buildRoute(from, to);
    }
}`,
  objects: [
    { id: 'strategy', label: '<<interface>>\nRouteStrategy', type: 'interface', x: 80, y: 40, w: 180, h: 64 },
    { id: 'car', label: 'CarStrategy', type: 'class', x: 20, y: 180, w: 140, h: 56 },
    { id: 'walk', label: 'WalkingStrategy', type: 'class', x: 180, y: 180, w: 140, h: 56 },
    { id: 'bus', label: 'PublicTransportStrategy', type: 'class', x: 340, y: 180, w: 160, h: 56 },
    { id: 'navigator', label: 'Navigator', subtitle: 'strategy = null', type: 'class', x: 580, y: 40, w: 160, h: 64 },
    { id: 'result', label: '路线结果', subtitle: '—', type: 'object', x: 600, y: 220, w: 120, h: 56 },
  ],
  generateSteps: () => [
    mkStep('创建 Navigator（上下文），此时还没有设置策略。', 31, ['navigator'], undefined, { navigator: 'strategy = null' }),
    mkStep('用户选择驾车出行，Navigator 设置 CarStrategy。', 34, ['navigator', 'car'], { from: 'car', to: 'navigator', label: 'setStrategy(car)' }, { navigator: 'strategy = CarStrategy' }),
    mkStep('Navigator 调用策略的 buildRoute()。', 38, ['navigator', 'car'], { from: 'navigator', to: 'car', label: 'buildRoute(A, B)' }),
    mkStep('CarStrategy 计算并返回驾车路线。', 5, ['car'], undefined, { car: '驾车路线', result: '驾车路线: A -> B' }),
    mkStep('Navigator 返回驾车路线结果。', 39, ['navigator', 'result'], { from: 'navigator', to: 'result', label: 'return route' }, { result: '驾车路线: A -> B' }),
    mkStep('用户切换为步行策略。', 34, ['navigator', 'walk'], { from: 'walk', to: 'navigator', label: 'setStrategy(walk)' }, { navigator: 'strategy = WalkingStrategy' }),
    mkStep('Navigator 调用新的策略计算路线。', 38, ['navigator', 'walk'], { from: 'navigator', to: 'walk', label: 'buildRoute(A, B)' }),
    mkStep('WalkingStrategy 返回步行路线。', 11, ['walk'], undefined, { walk: '步行路线', result: '步行路线: A -> B' }),
    mkStep('用户再次切换为公交策略。', 34, ['navigator', 'bus'], { from: 'bus', to: 'navigator', label: 'setStrategy(bus)' }, { navigator: 'strategy = PublicTransportStrategy' }),
    mkStep('同样的 Navigator.buildRoute() 调用，这次由公交策略处理。', 38, ['navigator', 'bus'], { from: 'navigator', to: 'bus', label: 'buildRoute(A, B)' }),
    mkStep('PublicTransportStrategy 返回公交路线，证明算法可以在运行时互换。', 17, ['bus'], undefined, { bus: '公交路线', result: '公交路线: A -> B' }),
  ],
}

// ============================================================
// 5. 装饰器模式 Decorator
// ============================================================
export const decoratorPattern: PatternDefinition = {
  id: 'decorator',
  name: '装饰器模式',
  category: 'structural',
  icon: '🎁',
  desc: '动态地给对象添加额外职责，比生成子类更灵活。',
  scenario: '咖啡店：一杯浓缩咖啡可以动态添加牛奶、糖等配料。',
  code: `interface Coffee {
    double cost();
    String description();
}

class SimpleCoffee implements Coffee {
    public double cost() { return 10; }
    public String description() { return "浓缩咖啡"; }
}

abstract class CoffeeDecorator implements Coffee {
    protected Coffee coffee;

    CoffeeDecorator(Coffee c) {
        this.coffee = c;
    }

    public double cost() {
        return coffee.cost();
    }

    public String description() {
        return coffee.description();
    }
}

class MilkDecorator extends CoffeeDecorator {
    MilkDecorator(Coffee c) { super(c); }
    public double cost() { return super.cost() + 3; }
    public String description() { return super.description() + " + 牛奶"; }
}

class SugarDecorator extends CoffeeDecorator {
    SugarDecorator(Coffee c) { super(c); }
    public double cost() { return super.cost() + 2; }
    public String description() { return super.description() + " + 糖"; }
}`,
  objects: [
    { id: 'coffee', label: '<<interface>>\nCoffee', type: 'interface', x: 200, y: 40, w: 160, h: 64 },
    { id: 'simple', label: 'SimpleCoffee', subtitle: 'cost=10', type: 'class', x: 80, y: 180, w: 140, h: 56 },
    { id: 'decorator', label: '<<abstract>>\nCoffeeDecorator', subtitle: 'wraps Coffee', type: 'class', x: 280, y: 180, w: 160, h: 56 },
    { id: 'milk', label: 'MilkDecorator', subtitle: '+3', type: 'class', x: 480, y: 180, w: 140, h: 56 },
    { id: 'sugar', label: 'SugarDecorator', subtitle: '+2', type: 'class', x: 660, y: 180, w: 140, h: 56 },
    { id: 'order', label: '最终订单', subtitle: '—', type: 'object', x: 660, y: 40, w: 140, h: 56 },
  ],
  generateSteps: () => [
    mkStep('点一杯 SimpleCoffee（浓缩咖啡），基础价格 10 元。', 7, ['simple', 'coffee'], { from: 'simple', to: 'coffee', label: 'implements' }, { simple: 'cost=10', order: '—' }, ['simple']),
    mkStep('用 MilkDecorator 包装 SimpleCoffee。', 24, ['simple', 'milk'], { from: 'simple', to: 'milk', label: 'new MilkDecorator(coffee)' }, undefined, ['milk']),
    mkStep('MilkDecorator 继承 CoffeeDecorator，内部持有被装饰的 Coffee。', 21, ['milk', 'decorator'], { from: 'milk', to: 'decorator', label: 'extends' }),
    mkStep('用 SugarDecorator 继续包装加了牛奶的咖啡。', 31, ['milk', 'sugar'], { from: 'milk', to: 'sugar', label: 'new SugarDecorator(milk)' }, undefined, ['sugar']),
    mkStep('SugarDecorator 也继承 CoffeeDecorator，形成包装链。', 21, ['sugar', 'decorator'], { from: 'sugar', to: 'decorator', label: 'extends' }),
    mkStep('调用最终订单的 cost()，请求从 SugarDecorator 开始向内委托。', 36, ['order', 'sugar'], { from: 'order', to: 'sugar', label: 'cost()' }),
    mkStep('SugarDecorator 先调用 MilkDecorator 的 cost()。', 37, ['sugar', 'milk'], { from: 'sugar', to: 'milk', label: 'super.cost()' }),
    mkStep('MilkDecorator 再调用 SimpleCoffee 的 cost()。', 25, ['milk', 'simple'], { from: 'milk', to: 'simple', label: 'super.cost()' }),
    mkStep('SimpleCoffee 返回基础价格 10。', 8, ['simple'], undefined, { simple: '10' }),
    mkStep('MilkDecorator 加上牛奶价格 3，返回 13。', 25, ['milk'], undefined, { milk: '13' }),
    mkStep('SugarDecorator 加上糖价格 2，最终返回 15。', 35, ['sugar'], undefined, { sugar: '15', order: '总价: 15' }),
    mkStep('最终订单描述为：浓缩咖啡 + 牛奶 + 糖。', 39, ['order'], undefined, { order: '浓缩咖啡 + 牛奶 + 糖' }),
  ],
}

export const allPatterns: PatternDefinition[] = [
  singletonPattern,
  factoryPattern,
  observerPattern,
  strategyPattern,
  decoratorPattern,
]
