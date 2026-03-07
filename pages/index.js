import { Row, Col, Card, Typography, Space, Avatar, Progress } from 'antd';
import {
  CalendarOutlined,
  TrophyOutlined,
  TeamOutlined,
  FieldTimeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  UserOutlined,
} from '@ant-design/icons';
import Dashboard from '@ui/layout/Dashboard';
import Loading from '@ui/common/Loading';
import DashboardList from '@ui/common/Dashboard/List';
import { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';
import { snackbar } from '@lib/snackbar';
import { authService } from '@services/auth.service';

const { Title, Text } = Typography;

const StatCard = ({ title, value, icon, gradient, subtitle, trend }) => (
  <Card
    bordered={false}
    style={{
      borderRadius: 24,
      background: gradient,
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
      height: '100%',
      overflow: 'hidden',
      position: 'relative',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
    }}
    hoverable
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-8px)';
      e.currentTarget.style.boxShadow = '0 16px 48px rgba(0, 0, 0, 0.2)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
    }}
  >
    <div style={{ position: 'relative', zIndex: 1 }}>
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.92)',
                fontSize: 14,
                fontWeight: 600,
                display: 'block',
                letterSpacing: 0.3,
              }}
            >
              {title}
            </Text>
            <Title
              level={2}
              style={{
                color: '#fff',
                margin: '10px 0 0 0',
                fontSize: 40,
                fontWeight: 800,
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              }}
            >
              {value}
            </Title>
            {subtitle && (
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.88)',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {subtitle}
              </Text>
            )}
          </div>
          <Avatar
            size={64}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.22)',
              backdropFilter: 'blur(12px)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
            }}
            icon={icon}
          />
        </div>
        {trend && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: 12,
              backdropFilter: 'blur(10px)',
            }}
          >
            <RiseOutlined
              style={{ color: '#4ade80', fontSize: 16, fontWeight: 'bold' }}
            />
            <Text style={{ color: '#4ade80', fontSize: 14, fontWeight: 700 }}>
              {trend}
            </Text>
            <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13 }}>
              vs. mes anterior
            </Text>
          </div>
        )}
      </Space>
    </div>
    <div
      style={{
        position: 'absolute',
        bottom: -30,
        right: -30,
        width: 150,
        height: 150,
        background: 'rgba(255, 255, 255, 0.08)',
        borderRadius: '50%',
        zIndex: 0,
      }}
    />
    <div
      style={{
        position: 'absolute',
        top: -20,
        left: -20,
        width: 100,
        height: 100,
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '50%',
        zIndex: 0,
      }}
    />
  </Card>
);

const Home = () => {
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();

  const load = useCallback(async () => {
    try {
      setUser(await authService.user());
    } catch (error) {
      snackbar.error(enqueueSnackbar, error);
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading />;

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? 'Buenos días'
      : currentHour < 18
      ? 'Buenas tardes'
      : 'Buenas noches';

  const currentDate = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Card
        bordered={false}
        style={{
          borderRadius: 24,
          background:
            'linear-gradient(135deg, #0ea5e9 0%, #2563eb 50%, #7c3aed 100%)',
          boxShadow: '0 16px 56px rgba(37, 99, 235, 0.3)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 250,
            height: 250,
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 180,
            height: 180,
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '50%',
          }}
        />
        <Row
          align="middle"
          justify="space-between"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <Col xs={24} lg={18}>
            <Space direction="vertical" size={8}>
              <Space align="center" size={16}>
                <Avatar
                  size={72}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.28)',
                    backdropFilter: 'blur(12px)',
                    border: '3px solid rgba(255, 255, 255, 0.35)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                  }}
                  icon={<UserOutlined style={{ fontSize: 36 }} />}
                />
                <div>
                  <Title
                    level={1}
                    style={{
                      color: '#fff',
                      margin: 0,
                      fontSize: 38,
                      fontWeight: 800,
                      textShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
                    }}
                  >
                    {greeting}, {user?.Person?.firstName || 'Usuario'}
                  </Title>
                  <Text
                    style={{
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: 16,
                      display: 'block',
                      marginTop: 4,
                    }}
                  >
                    Sistema de Gestión de Canchas de Fútbol Sala
                  </Text>
                  <Text
                    style={{
                      color: 'rgba(255, 255, 255, 0.75)',
                      fontSize: 14,
                      display: 'block',
                      marginTop: 2,
                      textTransform: 'capitalize',
                    }}
                  >
                    {currentDate}
                  </Text>
                </div>
              </Space>
            </Space>
          </Col>
          <Col xs={0} lg={6} style={{ textAlign: 'right' }}>
            <TrophyOutlined
              style={{ fontSize: 80, color: 'rgba(255, 255, 255, 0.25)' }}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Reservas Hoy"
            value="24"
            subtitle="8 pendientes"
            icon={<CalendarOutlined style={{ fontSize: 28, color: '#fff' }} />}
            gradient="linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)"
            trend="+12%"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Canchas Disponibles"
            value="3/5"
            subtitle="2 en uso ahora"
            icon={<FieldTimeOutlined style={{ fontSize: 28, color: '#fff' }} />}
            gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Clientes Activos"
            value="156"
            subtitle="Este mes"
            icon={<TeamOutlined style={{ fontSize: 28, color: '#fff' }} />}
            gradient="linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)"
            trend="+8%"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Ocupación"
            value="78%"
            subtitle="Promedio semanal"
            icon={
              <CheckCircleOutlined style={{ fontSize: 28, color: '#fff' }} />
            }
            gradient="linear-gradient(135deg, #ec4899 0%, #d946ef 100%)"
            trend="+15%"
          />
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            bordered={false}
            style={{
              borderRadius: 24,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              border: '1px solid #f1f5f9',
              transition: 'all 0.3s ease',
            }}
            hoverable
          >
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              <div>
                <Title
                  level={3}
                  style={{
                    marginBottom: 6,
                    color: '#1f2937',
                    fontSize: 24,
                    fontWeight: 700,
                  }}
                >
                  Accesos Rápidos
                </Title>
                <Text
                  type="secondary"
                  style={{ fontSize: 15, fontWeight: 500 }}
                >
                  Gestiona reservas, canchas y configuración del sistema
                </Text>
              </div>
              <DashboardList menuCode="admhead" />
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Card
              bordered={false}
              style={{
                borderRadius: 24,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                border: '1px solid #f1f5f9',
                transition: 'all 0.3s ease',
              }}
              hoverable
            >
              <Space direction="vertical" size={20} style={{ width: '100%' }}>
                <div style={{ textAlign: 'center' }}>
                  <Avatar
                    size={88}
                    style={{
                      background:
                        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: '4px solid #f3f4f6',
                      boxShadow: '0 8px 24px rgba(102, 126, 234, 0.25)',
                    }}
                    icon={<UserOutlined style={{ fontSize: 44 }} />}
                  />
                  <Title
                    level={4}
                    style={{
                      marginTop: 16,
                      marginBottom: 6,
                      color: '#1f2937',
                      fontWeight: 700,
                    }}
                  >
                    {user?.Person?.firstName} {user?.Person?.lastName}
                  </Title>
                  <Text
                    type="secondary"
                    style={{ fontSize: 14, fontWeight: 500 }}
                  >
                    {user?.email}
                  </Text>
                  <div
                    style={{
                      marginTop: 20,
                      padding: '14px 18px',
                      background:
                        'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                      borderRadius: 14,
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    <Text
                      strong
                      style={{
                        color: '#059669',
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      Administrador del Sistema
                    </Text>
                  </div>
                </div>
              </Space>
            </Card>

            <Card
              bordered={false}
              style={{
                borderRadius: 24,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                border: '1px solid #f1f5f9',
                transition: 'all 0.3s ease',
              }}
              hoverable
            >
              <Space direction="vertical" size={20} style={{ width: '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    strong
                    style={{ color: '#1f2937', fontSize: 16, fontWeight: 700 }}
                  >
                    Actividad Hoy
                  </Text>
                  <ClockCircleOutlined
                    style={{ fontSize: 20, color: '#0ea5e9' }}
                  />
                </div>
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ fontSize: 13, color: '#6b7280' }}>
                        Reservas confirmadas
                      </Text>
                      <Text strong style={{ fontSize: 13, color: '#1f2937' }}>
                        16/24
                      </Text>
                    </div>
                    <Progress
                      percent={67}
                      strokeColor="#10b981"
                      showInfo={false}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ fontSize: 13, color: '#6b7280' }}>
                        Capacidad utilizada
                      </Text>
                      <Text strong style={{ fontSize: 13, color: '#1f2937' }}>
                        78%
                      </Text>
                    </div>
                    <Progress
                      percent={78}
                      strokeColor="#f59e0b"
                      showInfo={false}
                    />
                  </div>
                </div>
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>
    </Space>
  );
};

Home.propTypes = {};
Home.Layout = Dashboard;

export default Home;
